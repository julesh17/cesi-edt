"""Régressions des abonnements historiques P1/P2 et optionnels G1/G2.

Les données Supabase sont simulées : aucune connexion ou base de production
n'est nécessaire pour exécuter ces tests.
"""
import asyncio
import importlib
import re
import sys
import types
from pathlib import Path

import httpx
from jinja2 import Environment, FileSystemLoader


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def event(name, groups=None):
    return {
        "start": "2026-11-23T08:30:00",
        "end": "2026-11-23T10:30:00",
        "summary": name,
        "groups": groups if groups is not None else [],
        "teachers": ["Formateur"],
    }


PLANNING = {
    "events_p1": [
        event("P1-COMMUN"),
        event("P1-G1", ["G 1"]),
        event("P1-G2", ["G 2"]),
        event("P1-DEUX", ["G 1", "G 2"]),
        event("P1-VARIANTE", ["G.1"]),
        event("P1-ATELIER", ["Atelier Bleu"]),
        event("P1-GROUPE-ALT", ["Groupe A"]),
        event("P1-TP-G1", ["TP G1"]),
    ],
    "events_p2": [
        event("P2-COMMUN"),
        event("P2-G1", ["G1"]),
        event("P2-G2", ["G 2"]),
        event("P2-ACCENT", ["Équipe spéciale"]),
    ],
}


class FakeQuery:
    def __init__(self, table_name, planning):
        self.table_name = table_name
        self.planning = planning
        self.columns = None
        self.slug = None

    def select(self, cols):
        self.columns = cols
        return self

    def ilike(self, field, value):
        assert field == "slug"
        self.slug = value
        return self

    def execute(self):
        if self.table_name != "plannings" or self.slug != "test-promo":
            return types.SimpleNamespace(data=[])
        return types.SimpleNamespace(data=[{
            col: self.planning.get(col) for col in self.columns.split(", ")
        }])


class FakeSupabase:
    def __init__(self, planning):
        self.planning = planning

    def table(self, name):
        return FakeQuery(name, self.planning)


def import_app():
    # Le package supabase n'est pas nécessaire pour ces tests hors-ligne.
    if "api.main" not in sys.modules:
        fake_module = types.ModuleType("supabase")
        fake_module.Client = object
        fake_module.create_client = lambda *args, **kwargs: FakeSupabase(PLANNING)
        sys.modules.setdefault("supabase", fake_module)
    main = importlib.import_module("api.main")
    main.supabase = FakeSupabase(PLANNING)
    return main


def request(app, path, method="GET"):
    async def send():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as client:
            return await client.request(method, path)

    return asyncio.run(send())


def ics_summaries(ics):
    # La dénomination peut inclure les groupes, mais chaque titre reste unique.
    return [line.split(":", 1)[1] for line in ics.splitlines()
            if line.startswith("SUMMARY:")]


def assert_has_titles(response, expected, excluded=()):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/calendar")
    titles = ics_summaries(response.text)
    for name in expected:
        assert any(t.startswith(name) for t in titles), (name, titles)
    for name in excluded:
        assert not any(t.startswith(name) for t in titles), (name, titles)
    assert len(titles) == len(expected), titles


def test_p1_and_p2_legacy_subscriptions_unchanged():
    main = import_app()
    for promo, names in [
        ("p1", ["P1-COMMUN", "P1-G1", "P1-G2", "P1-DEUX", "P1-VARIANTE", "P1-ATELIER", "P1-GROUPE-ALT", "P1-TP-G1"]),
        ("p2", ["P2-COMMUN", "P2-G1", "P2-G2", "P2-ACCENT"]),
    ]:
        response = request(main.app, f"/ics/test-promo/{promo}.ics")
        assert_has_titles(response, names)
        # Vérifier le préfixe historique des UID, pas uniquement la liste.
        uid = re.search(r"^UID:(.*)$", response.text, re.M).group(1)
        expected = main.events_to_ics_string(PLANNING[f"events_{promo}"],
                                            uid_namespace=f"test-promo:{promo.upper()}")
        assert uid in expected


def test_subgroup_subscriptions_include_common_courses():
    main = import_app()
    scenarios = {
        "p1-g1": (["P1-COMMUN", "P1-G1", "P1-DEUX", "P1-VARIANTE"], ["P1-G2", "P1-TP-G1", "P1-ATELIER"]),
        "p1-g2": (["P1-COMMUN", "P1-G2", "P1-DEUX"], ["P1-G1", "P1-VARIANTE", "P1-ATELIER"]),
        "p2-g1": (["P2-COMMUN", "P2-G1"], ["P2-G2", "P2-ACCENT"]),
        "p2-g2": (["P2-COMMUN", "P2-G2"], ["P2-G1", "P2-ACCENT"]),
    }
    for group, (expected, excluded) in scenarios.items():
        response = request(main.app, f"/ics/test-promo/{group}.ics")
        assert_has_titles(response, expected, excluded)
        assert "BEGIN:VCALENDAR" in response.text
        assert "TZID:Europe/Paris" in response.text
        assert "END:VCALENDAR" in response.text


def test_head_and_invalid_links():
    main = import_app()
    get = request(main.app, "/ics/test-promo/p1-g1.ics")
    head = request(main.app, "/ics/test-promo/p1-g1.ics", "HEAD")
    assert get.status_code == head.status_code == 200
    assert head.content == b""
    assert head.headers["content-length"] == str(len(get.content))
    assert request(main.app, "/ics/test-promo/p1-g3.ics").status_code == 404
    assert request(main.app, "/ics/test-promo/p3-g1.ics").status_code == 404
    assert request(main.app, "/ics/not-found/p1-g1.ics").status_code == 404


def test_named_subgroups_are_discovered_and_linked():
    main = import_app()
    result = request(main.app, "/api/ics-subgroups/test-promo")
    assert result.status_code == 200
    data = result.json()
    for promo in ("p1", "p2"):
        entries = data[promo]
        assert len(entries) == len({e["url"] for e in entries})
        assert any(x["label"] == "G1" and x["url"].endswith(f"/{promo}-g1.ics") for x in entries)
        assert any(x["label"] == "G2" and x["url"].endswith(f"/{promo}-g2.ics") for x in entries)

    for label, expected, excluded in [
        ("Atelier Bleu", ["P1-COMMUN", "P1-ATELIER"], ["P1-G1", "P1-G2", "P1-TP-G1"]),
        ("Groupe A", ["P1-COMMUN", "P1-GROUPE-ALT"], ["P1-G1", "P1-G2"]),
        ("TP G1", ["P1-COMMUN", "P1-TP-G1"], ["P1-G1", "P1-G2"]),
    ]:
        option = next(x for x in data["p1"] if x["label"] == label)
        url = option["url"].replace("https://edt.cesi-tools.workers.dev", "")
        assert_has_titles(request(main.app, url), expected, excluded)
        assert request(main.app, url, "HEAD").status_code == 200

    accent = next(x for x in data["p2"] if x["label"] == "Équipe spéciale")
    assert_has_titles(
        request(main.app, accent["url"].replace("https://edt.cesi-tools.workers.dev", "")),
        ["P2-COMMUN", "P2-ACCENT"], ["P2-G1", "P2-G2"]
    )
    assert request(main.app, "/ics/test-promo/p1-sg-Z3JvdXBlIGluZXhpc3RhbnQ.ics").status_code == 404
    assert request(main.app, "/ics/test-promo/p1-sg-bad!.ics").status_code == 404


def test_custom_group_names_only_show_real_names():
    main = import_app()
    old = main.supabase
    main.supabase = FakeSupabase({
        "events_p1": [event("P1-COMMUN"), event("P1-ALPHA", ["Atelier Alpha"]), event("P1-BETA", ["Atelier Bêta"])],
        "events_p2": [event("P2-COMMUN"), event("P2-TD", ["TD A"])],
    })
    try:
        result = request(main.app, "/api/ics-subgroups/test-promo")
        assert result.status_code == 200
        assert [o["label"] for o in result.json()["p1"]] == ["Atelier Alpha", "Atelier Bêta"]
        assert [o["label"] for o in result.json()["p2"]] == ["TD A"]
    finally:
        main.supabase = old


def test_empty_promo_keeps_legacy_optional_g1_g2_links():
    main = import_app()
    assert [x["label"] for x in main.ics_subgroup_options([], "p1")] == ["G1", "G2"]


def test_home_page_keeps_original_links_and_removes_explanation():
    env = Environment(loader=FileSystemLoader(str(ROOT / "templates")))
    html = env.get_template("index.html").render(
        plannings=[{
            "slug": "test-promo", "name": "Test", "year": "2026-2027",
            "creator": "Tester", "updated_at": None,
        }],
        user="Tester", current_filter="all",
        request=types.SimpleNamespace(query_params={}),
    )
    for suffix in ("p1", "p2"):
        assert f"/ics/test-promo/{suffix}.ics" in html
    assert '<details class="ics-subgroup-options mb-4" data-planning-slug="test-promo">' in html
    assert "Liens ICS par demi-groupe (optionnel)" in html
    assert "/api/ics-subgroups/" in html
    assert "Chaque lien contient les séances" not in html
    assert "Les liens P1 et P2 ci-dessus restent inchangés" not in html
    assert "{{ promo | upper }} / G{{ subgroup }}" not in html
