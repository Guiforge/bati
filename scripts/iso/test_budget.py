#!/usr/bin/env python3
"""Proof that the V1 budget guard counts V1 spend only, stops at the ceiling and at each 10 $,
survives a render failing in flight, a top-up and two runs at once.

    python3 scripts/iso/test_budget.py

No network, no FLUX: `credits()` reads a fake balance and `flux.generate` is a stub that bills
`cost` the way BFL does (on submission). The ledger and the candidate folders live in a temp dir,
seeded with the POC's real top-level figures. Batches go through the real `candidates()`.
"""

import contextlib
import io
import json
import os
import pathlib
import tempfile
import threading
import time

import iso_loop as I

POC = {"initial_credits": 2300.1, "reserved": 0.0, "real": 5.04, "probe_real": 1.74, "balance": 1820.1,
       "by_balance": 4.8, "probe2_real": 1.5, "probe3_real": 1.5, "batches": [{"label": "poc", "cost": 5.04}]}
SLUG, VARIANT = "forge_solid", "w5g"  # the V1 backdrop, counted against no POC probe
balance = [3796.1]
fail_at: list[int | None] = [None]
calls = [0]
lock = threading.Lock()
I.credits = lambda: balance[0]


klein_cost = [1.1]  # credits per Klein image; the published 1.5K tier is 1.1


def fake_generate(*, submitted_log, endpoint=None, extra=None, **_):
    """Bill like BFL: a submission is charged (cost in credits) and lowers the balance, then the
    poll may still fail; `fail_at` makes the call with that running number raise after billing."""
    klein, f3 = endpoint == I.KLEIN, endpoint == I.FLUX3
    assert klein or f3 or endpoint is None, endpoint
    assert (extra is None) if klein else (extra == {"width": 16, "height": 16}) if f3 else (set(extra) == {"width", "height"}), extra  # Klein's schema refuses it
    cost = klein_cost[0] if klein else 4.8 if f3 else 7.5
    with lock:
        submitted_log.append({"cost": cost, "input_mp": 1.15, "output_mp": 1.15})
        balance[0] = round(balance[0] - cost, 4)
        calls[0] += 1
        failing = calls[0] == fail_at[0]
    if failing:
        raise OSError("IncompleteRead in flight")
    return True


real_generate = I.flux.generate  # kept for the L2-T01 test of the real model field
I.flux.generate = fake_generate
attempt = [0]


def run(n: int = I.CANDIDATES) -> None:
    attempt[0] += 1
    with contextlib.redirect_stdout(io.StringIO()):
        I.candidates(SLUG, attempt[0], VARIANT, n)


def refused(call) -> str:
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            call()
    except SystemExit as stop:
        return str(stop.code)
    raise AssertionError("expected a stop")


def v1() -> dict:
    return I.ledger()["v1"]


HEAD = "# Validations\n\n```\n2026-11-05 BUDGET_FLUX_V1: 60\n```\n\n## Lignes\n"  # the real file's example


def set_ceiling(value) -> None:
    """Guillaume appends a line: the last one wins, the example above `## Lignes` never counts."""
    with I.VALIDATIONS.open("a", encoding="utf-8") as handle:
        handle.write(f"2026-11-05 BUDGET_FLUX_V1: {value}\n")


os.environ.pop("BUDGET_FLUX_V1", None)
with tempfile.TemporaryDirectory() as tmp:
    I.BUDGET = pathlib.Path(tmp) / "budget.json"
    I.L.WORK = pathlib.Path(tmp)  # candidate_dir() writes here, never in the real cache
    I.VALIDATIONS = pathlib.Path(tmp) / "VALIDATIONS.md"
    I.BUDGET.write_text(json.dumps(POC))

    # Ceiling source: no file, then the example only -> 40; lines under `## Lignes` -> the last.
    assert I.ceiling()[0] == 40.0 and "default" in I.ceiling()[1]
    I.VALIDATIONS.write_text(HEAD + "2026-11-02 H0: validé\n")
    assert I.ceiling()[0] == 40.0, "the example above `## Lignes` must not count"
    set_ceiling(55)
    set_ceiling("62,5")
    limit, source = I.ceiling()
    assert limit == 62.5 and source.endswith("BUDGET_FLUX_V1: 62,5"), (limit, source)
    set_ceiling("60 dollars")
    assert "not a number" in refused(I.ceiling)
    I.VALIDATIONS.write_text(HEAD)
    set_ceiling(40)
    os.environ["BUDGET_FLUX_V1"] = "55"
    assert "disagrees" in refused(I.ceiling)
    os.environ["BUDGET_FLUX_V1"] = "40"  # same value: harmless
    assert I.ceiling()[0] == 40.0
    del os.environ["BUDGET_FLUX_V1"]
    print("ok  ceiling: default 40, example ignored, last line wins, bad line and env conflict refused")

    assert I.CANDIDATES == 3, I.CANDIDATES
    assert "start-v1" in refused(run), "no render before the V1 marker"
    assert calls[0] == 0
    with contextlib.redirect_stdout(io.StringIO()):
        I.start_v1()
    assert "already" in refused(I.start_v1)

    # POC spend not counted, and still in the log.
    assert v1()["initial_credits"] == 3796.1 and I.spent(v1()) == 0.0
    run()
    data = I.ledger()
    assert I.spent(data["v1"]) == 0.225, I.spent(data["v1"])
    assert data["real"] == 5.04 and data["batches"] == POC["batches"] and len(data["v1"]["batches"]) == 1
    assert data["v1"]["reserved"] == 0.0 and "mismatch" not in data["v1"]["batches"][-1]
    print("ok  POC spend (5.04 $) not counted, POC entries kept; a batch of 3 through candidates()")

    # A render failing in flight: the reservation is freed and what was billed is booked.
    fail_at[0] = calls[0] + 2  # the second render of the batch
    before = I.spent(v1())
    try:
        run()
        raise AssertionError("the failure should propagate")
    except OSError:
        pass
    fail_at[0] = None
    assert v1()["reserved"] == 0.0, v1()["reserved"]
    assert round(I.spent(v1()) - before, 4) == 0.225 and v1()["batches"][-1]["posts"] == 3
    print("ok  failure in flight: reservation freed, billed cost kept")

    # Top-up mid V1: the rise moves initial_credits up, no false mismatch, spend unchanged.
    before = I.spent(v1())
    balance[0] += 5000
    run()
    last = v1()
    assert "mismatch" not in last["batches"][-1], last["batches"][-1]
    assert round(last["by_balance"], 4) == round(last["real"], 4) == round(before + 0.225, 4)
    assert last["topups"][-1]["credits"] == 5000 and last["balance"] == balance[0]
    print("ok  top-up: initial_credits raised by the rise, no mismatch, last balance kept")

    # Two reservations at once with room for one: the lock serialises them, exactly one passes.
    set_ceiling(round(I.spent(v1()) + 0.35, 4))
    real_spent, outcomes = I.spent, []

    def slow_spent(data):
        time.sleep(0.2)  # widens the read-check-write window that an unlocked ledger would race in
        return real_spent(data)

    def try_reserve():
        try:
            outcomes.append(I.reserve(3, I.RESERVE["image"], "race", None))
        except SystemExit as stop:
            outcomes.append(str(stop.code))

    I.spent = slow_spent
    threads = [threading.Thread(target=try_reserve) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    I.spent = real_spent
    assert sum(isinstance(o, dict) for o in outcomes) == 1, outcomes
    assert any(isinstance(o, str) and o.startswith("hard stop") for o in outcomes), outcomes
    assert v1()["reserved"] == 0.3
    with I.locked():  # release the race's reservation by hand
        data = I.ledger()
        data["v1"]["reserved"] = 0.0
        I.save_ledger(data)
    print("ok  two concurrent reservations serialised by the lock, one refused")

    # Ceiling: a batch that would take spent + reserved past BUDGET_FLUX_V1 is refused, nothing billed.
    tight = round(I.spent(v1()) + 0.25, 4)
    set_ceiling(tight)
    n_calls = calls[0]
    assert refused(lambda: run(4)).startswith("hard stop")
    assert calls[0] == n_calls and v1()["reserved"] == 0.0
    run(2)  # 0.20 fits under 0.25
    last = v1()["batches"][-1]
    assert last["ceiling"] == tight and last["ceiling_source"].endswith(f"BUDGET_FLUX_V1: {tight}"), last
    assert v1()["batches"][0]["ceiling"] == 40.0, "an earlier batch keeps the ceiling it ran under"
    print("ok  ceiling stops a batch that would exceed it, before any submission; each batch records its ceiling")

    # Alert at each 10 $: the batch that crosses 10 $ settles, the next one is refused until ack.
    set_ceiling(40.0)
    while I.spent(v1()) < 10:
        run()
    stop = refused(run)
    assert stop.startswith("alert stop, checkpoint: V1 spent 10.") and "budget ack" in stop, stop
    with contextlib.redirect_stdout(io.StringIO()):
        I.ack()
    run()
    while I.spent(v1()) < 20:
        run()
    assert refused(run).startswith("alert stop")
    with contextlib.redirect_stdout(io.StringIO()):
        I.ack()
    assert v1()["alert_ack"] == 2
    print("ok  alert stop at 10 $ and at 20 $, resumed by ack")

    # Klein (L1-T08): the price by tier, a batch of 3 booked at its `cost`, a mis-billed one stops.
    assert I.klein_price(768, 768) == 0.008 and I.klein_price(1024, 1024) == 0.009
    assert I.klein_price(896, 1344) == 0.011 and I.klein_price(2048, 2048) == 0.014 and I.klein_price(4096, 4096) == 0.036
    before, reserved_calls = I.spent(v1()), []
    real_reserve = I.reserve
    I.reserve = lambda n, each, *a: reserved_calls.append(round(n * each, 4)) or real_reserve(n, each, *a)
    VARIANT = "w5gk"
    run()
    assert reserved_calls == [0.06], reserved_calls
    assert round(I.spent(v1()) - before, 4) == 0.033 and v1()["batches"][-1]["cost"] == 0.033, v1()["batches"][-1]
    assert I.ledger()["klein_trial_real"] == 0.033, "a Klein batch counts against its own probe"
    print("ok  Klein: tier price, a batch of 3 reserved 0.06 $ and booked at 0.033 $ on klein_trial_real")

    # L1-T10: mis-billed while a render raises in flight; the stop is written by settle() anyway,
    # and it outlives the process: the next batch, Klein or not, is refused until klein-ack.
    klein_cost[0], fail_at[0] = 4.5, calls[0] + 2
    try:
        run()
        raise AssertionError("the failure should propagate")
    except OSError:
        pass
    fail_at[0], klein_cost[0] = None, 1.1
    assert v1()["klein_stop"].startswith("Klein billed [0.045, 0.045, 0.045]"), v1().get("klein_stop")
    n_calls = calls[0]
    assert refused(run).startswith("Klein billing stop")
    VARIANT = "w5g"
    assert refused(run).startswith("Klein billing stop") and calls[0] == n_calls
    with contextlib.redirect_stdout(io.StringIO()):
        I.klein_ack()
    assert "klein_stop" not in v1()
    VARIANT = "w5gk"
    run()  # resumes after the lift
    print("ok  Klein billing stop: set by settle() after a render raised, kept in the ledger, lifted by klein-ack only")

    # L1-T10: the trial's own cap, 0.50 $ for all its attempts, before any submission.
    with I.locked():
        data = I.ledger()
        data["klein_trial_real"] = 0.45
        I.save_ledger(data)
    n_calls = calls[0]
    assert refused(run).startswith("probe budget klein_trial_real") and calls[0] == n_calls
    run(2)  # 0.45 + 0.04 fits under 0.50
    assert I.ledger()["klein_trial_real"] == 0.472
    print("ok  Klein trial cap: 0.50 $ cumulated, a batch past it refused before submission")

    # L1-T10: a tier above RESERVE["klein"] reserves its own price.
    with I.locked():
        data = I.ledger()
        data["klein_trial_real"] = 0.0
        I.save_ledger(data)
    real_price, I.klein_price, klein_cost[0] = I.klein_price, (lambda w, h: 0.036), 3.6
    run()
    assert reserved_calls[-1] == 0.108, reserved_calls
    klein_cost[0], VARIANT, I.reserve, I.klein_price = 1.1, "w5g", real_reserve, real_price
    print("ok  Klein reservation: max(RESERVE['klein'], tier price)")

    # L1-T11: Ctrl-C during settle()'s balance read: the cost, the freed reservation and the stop
    # are already in budget.json.
    def interrupted():
        raise KeyboardInterrupt

    VARIANT, klein_cost[0], real_spent_before = "w5gk", 4.5, I.ledger()["v1"]["real"]
    I.credits = interrupted
    try:
        run()
        raise AssertionError("the interrupt should propagate")
    except KeyboardInterrupt:
        pass
    I.credits = lambda: balance[0]
    on_disk = json.loads(I.BUDGET.read_text())["v1"]
    assert on_disk["klein_stop"].startswith("Klein billed [0.045, 0.045, 0.045]"), on_disk.get("klein_stop")
    assert round(on_disk["real"] - real_spent_before, 4) == 0.135 and on_disk["reserved"] == 0.0, on_disk
    with contextlib.redirect_stdout(io.StringIO()):
        I.klein_ack()
    VARIANT, klein_cost[0] = "w5g", 1.1
    print("ok  settle(): cost, freed reservation and Klein stop on disk before the balance read")

    # L1-T11: two batches of the same probe reserved before either settles: the second one counts
    # the first one's reservation and is refused.
    with I.locked():
        data = I.ledger()
        data["klein_trial_real"] = 0.40
        I.save_ledger(data)
    first = I.reserve(3, 0.02, "in flight 1", "klein_trial_real")
    assert "probe budget klein_trial_real" in refused(lambda: I.reserve(3, 0.02, "in flight 2", "klein_trial_real"))
    assert I.ledger()["reserved_by_probe"]["klein_trial_real"] == 0.06
    I.settle(first, [])
    assert I.ledger()["reserved_by_probe"]["klein_trial_real"] == 0.0 and I.ledger()["v1"]["reserved"] == 0.0
    # L1-T13: two batches in flight at once; settling one frees its own share only (mutant M7).
    with I.locked():
        data = I.ledger()
        data["klein_trial_real"] = 0.30
        I.save_ledger(data)
    first = I.reserve(3, 0.02, "in flight 1", "klein_trial_real")
    second = I.reserve(2, 0.02, "in flight 2", "klein_trial_real")
    assert I.ledger()["reserved_by_probe"]["klein_trial_real"] == 0.10
    I.settle(first, [])
    assert I.ledger()["reserved_by_probe"]["klein_trial_real"] == 0.04, "the second batch is still in flight"
    I.settle(second, [])
    assert I.ledger()["reserved_by_probe"]["klein_trial_real"] == 0.0 and I.ledger()["v1"]["reserved"] == 0.0
    print("ok  probe cap counts the probe's reservations in flight; settle() frees its own batch's share")

    # L1-T13: an orphan probe reservation (a batch killed by SIGKILL never settles) is cleared by
    # klein-ack, with the global one, run by the team lead when no batch is in flight.
    orphan = I.reserve(3, 0.02, "killed", "klein_trial_real")
    with contextlib.redirect_stdout(io.StringIO()) as said:
        I.klein_ack()
    assert I.ledger()["reserved_by_probe"]["klein_trial_real"] == 0.0 and I.ledger()["v1"]["reserved"] == 0.0
    assert "0.06" in said.getvalue(), said.getvalue()
    del orphan
    print("ok  klein-ack clears an orphan reservation (probe and global)")

    # L1-T11: a reservation is rounded up to the cent, never under the cost.
    third = I.reserve(3, 0.011, "round up", None)
    assert third["amount"] == 0.04, third
    assert I.reserve(3, 0.1, "exact", None)["amount"] == 0.3  # float noise does not add a cent
    I.settle(third, [])
    with I.locked():
        data = I.ledger()
        data["v1"]["reserved"] = 0.0
        I.save_ledger(data)
    print("ok  reservation rounded up to the cent")

    # L2-T08: the production Klein probe has its own 5 $ cap: the trial being full does not stop it,
    # its batches count against klein_prod_real only, and a batch past 5 $ is refused before submission.
    with I.locked():
        data = I.ledger()
        data["klein_trial_real"], data["klein_prod_real"] = 0.50, 0.0
        I.save_ledger(data)
    VARIANT = "w5gk"
    assert refused(run).startswith("probe budget klein_trial_real")
    VARIANT = "w5gp"
    run()
    assert I.ledger()["klein_prod_real"] == 0.033 and I.ledger()["klein_trial_real"] == 0.50
    with I.locked():
        data = I.ledger()
        data["klein_prod_real"] = I.PROBE_CAPS["klein_prod_real"] - 0.01
        I.save_ledger(data)
    n_calls = calls[0]
    assert refused(run).startswith("probe budget klein_prod_real") and calls[0] == n_calls
    VARIANT = "w5g"
    print("ok  Klein production probe: own 5 $ cap, the full trial does not stop it, a batch past 5 $ refused")

    # Minor guards.
    for bad in (float("nan"), float("inf"), 0.0, -1.0):
        set_ceiling(bad)
        assert "finite ceiling" in refused(run), bad
    set_ceiling(40.0)
    assert "at least 1" in refused(lambda: run(0))
    assert I.RESERVE["image"] == 0.10
    assert I.spent({"real": 1.0, "by_balance": 1.2}) == 1.2
    assert not list(pathlib.Path(tmp).glob("*.tmp")), "atomic write leaves no temp file"
    print("ok  CANDIDATES = 3, ceiling nan/inf/0/-1 and n = 0 refused, reserve 0.10 $ per image")

    # Naming: `accept` (through write_sprite) writes where the app's nomImage() reads.
    spec = json.loads((I.L.ROOT / "constants" / "isoSpec.json").read_text(encoding="utf-8"))["nomImage"]
    assert spec == "<slug>/<stade>.<ambiance>.webp", spec  # the template the TS nomImage() fills
    I.L.SPRITES, I.L.RENDERS = pathlib.Path(tmp) / "sprites", pathlib.Path(tmp) / "renders"
    I.L.RENDERS.mkdir()
    for building in ("forge", "windmill", "training_dummy"):
        for stade in I.A_STAGES:
            want = spec.replace("<slug>", building).replace("<stade>", stade).replace("<ambiance>", "nuit")
            assert I.sprite_path(f"{building}_{stade}").relative_to(I.L.SPRITES).as_posix() == want
    assert I.sprite_path("training_dummy_grand").relative_to(I.L.SPRITES).as_posix() == "training_dummy/grand.nuit.webp"
    assert I.sprite_path("windmill_sails").name == "windmill_sails.webp", "no stage, no spec name yet"
    (I.L.RENDERS / "forge_solid.anchor.json").write_text(json.dumps({"size": [16, 16], "anchor": [8, 12], "canvas": "building2x2"}))
    sprite = I.Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    sprite.paste((90, 90, 120, 255), (4, 4, 12, 12))
    with contextlib.redirect_stdout(io.StringIO()):
        I.write_sprite("forge_solid", sprite, "flux")
    # T41 round 2: the FLUX 3 path goes through the same guard, reserve and settle. Klein and
    # strangers stay refused; 3 images book their real cost (4.8 credits each) and free the reserve.
    I.guard_endpoint(I.FLUX3)
    assert "FLUX endpoint" in refused(lambda: I.guard_endpoint("https://api.bfl.ai/v1/flux-2-pro-preview"))
    assert "FLUX endpoint" in refused(lambda: I.guard_endpoint(I.KLEIN))
    assert "FLUX endpoint" in refused(lambda: I.guard_endpoint("https://api.bfl.ai/v1/flux-4"))
    SLUG, VARIANT = "champion_arena_grand", "f3"
    (I.L.RENDERS / f"{SLUG}.anchor.json").write_text(json.dumps({"size": [16, 16], "anchor": [8, 12], "canvas": "building2x2"}))
    before, n_calls = I.spent(v1()), calls[0]
    run()
    assert calls[0] == n_calls + 3 and round(I.spent(v1()) - before, 4) == 0.144 and v1()["reserved"] == 0.0
    SLUG, VARIANT = "forge_solid", "w5g"
    print("ok  FLUX 3 path: guard accepts flux-3-image by its variant only, reserve and settle book 3 x 0.048 $")

    written = sorted(p.relative_to(I.L.SPRITES).as_posix() for p in I.L.SPRITES.rglob("*") if p.is_file())
    assert written == ["forge/solid.nuit.json", "forge/solid.nuit.webp"], written
    assert I.accepted("forge_solid") and not I.accepted("forge_grand")
    print("ok  naming: <building>_<stade> -> isoSpec.json nomImage, ambiance nuit, tap mask beside it")

    # L1-T13: a Klein candidate ships with the FLUX.2 pro licence string and its own model
    # (L1-R01). The ledger and the repo root are the temp dir's: the real provenance.json is untouched.
    folder = I.candidate_dir("forge_solid")
    sprite.paste((200, 30, 30, 255), (6, 6, 10, 10))  # a different image: the write must show
    sprite.save(folder / "w5gka9_c0.adaptive.cut.png")
    side = {"model": "flux-3-image-klein", "provider": "Black Forest Labs (direct API)", "licence": I.flux.LICENCE,
            "signed_original": {"file": "0123456789abcdef.png", "sha256": "0" * 64}, "prompt": "p", "seed": 7,
            "width": 16, "height": 16, "generated": "2026-10-28"}
    (folder / "w5gka9_c0.json").write_text(json.dumps(side))
    (folder / "w5gka9_audit_adaptive.json").write_text(
        json.dumps({"w5gka9_c0": {"pass": True, "registration": {"dx": 0, "dy": 0}, "background": "#0FFA09"}}))
    real_root, real_ledger = I.L.ROOT, I.flux.PROVENANCE
    I.L.ROOT, I.flux.PROVENANCE = pathlib.Path(tmp), pathlib.Path(tmp) / "provenance.json"
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            I.accept("forge_solid", "w5gka9_c0")
    finally:
        I.L.ROOT, I.flux.PROVENANCE = real_root, real_ledger
    written = json.loads((pathlib.Path(tmp) / "provenance.json").read_text())["sprites/forge/solid.nuit.webp"]
    assert written["model"] == "flux-3-image-klein" and written["provider"] == "Black Forest Labs (direct API)"
    assert written["licence"] == I.flux.LICENCE == ("BFL Developer Terms §3.b (EU §4.b): the API account holder owns "
                                                    "the output, personal or commercial use"), written["licence"]
    assert written["seed"] == 7 and written["edited"] is False and "#0FFA09" in written["cutout"], written
    shipped = I.Image.open(I.sprite_path("forge_solid")).convert("RGBA").getpixel((8, 8))
    assert all(abs(a - b) <= 4 for a, b in zip(shipped[:3], (200, 30, 30))), shipped  # the Klein cut shipped (WebP q90)
    print("ok  accept ships a flux-3-image-klein candidate with the FLUX.2 licence string and its own model")

    # L2-T01: the real flux.generate writes `model` from the endpoint, so a Klein sidecar says
    # flux-3-image-klein. Only the HTTP is stubbed (_json, _poll, urlopen); the key is a dummy.
    class Reply:
        def __init__(self, raw): self.raw = raw
        def __enter__(self): return self
        def __exit__(self, *_): return False
        def read(self): return self.raw

    png = io.BytesIO()
    I.Image.new("RGB", (8, 8), (10, 250, 9)).save(png, "PNG")
    saved = (I.flux._json, I.flux._poll, I.flux.urllib.request.urlopen, I.flux.ORIGINALS, os.environ.get("BFL_API_KEY"))
    I.flux._json = lambda url, key, payload=None, attempts=6: {"polling_url": "http://stub/poll", "cost": 1.1}
    I.flux._poll = lambda url, key, timeout=300.0: "http://stub/img.png"
    I.flux.urllib.request.urlopen = lambda url, timeout=0: Reply(png.getvalue())
    I.flux.ORIGINALS, os.environ["BFL_API_KEY"] = pathlib.Path(tmp) / "originals", "dummy"
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            assert real_generate(slug="m", prompt="p", out=pathlib.Path(tmp) / "k.png", width=8, height=8,
                                 attempts=1, endpoint=I.KLEIN)
        assert json.loads((pathlib.Path(tmp) / "k.json").read_text())["model"] == "flux-3-image-klein"
    finally:
        I.flux._json, I.flux._poll, I.flux.urllib.request.urlopen, I.flux.ORIGINALS = saved[:4]
        if saved[4] is None:
            del os.environ["BFL_API_KEY"]
    print("ok  the real flux.generate writes model = flux-3-image-klein for the Klein endpoint")

    # L2-T01: accept refuses a candidate that failed audit (A), and writes nothing.
    (folder / "w5gkaf_c0.adaptive.cut.png").write_bytes((folder / "w5gka9_c0.adaptive.cut.png").read_bytes())
    (folder / "w5gkaf_c0.json").write_text(json.dumps(side))
    (folder / "w5gkaf_audit_adaptive.json").write_text(
        json.dumps({"w5gkaf_c0": {"pass": False, "checks": {"light": {"pass": False}, "ink": {"pass": True}}, "registration": {"dx": 0, "dy": 0}, "background": "#0FFA09"}}))
    before_bytes = I.sprite_path("forge_solid").read_bytes()
    I.L.ROOT, I.flux.PROVENANCE = pathlib.Path(tmp), pathlib.Path(tmp) / "provenance.json"
    try:
        stop = refused(lambda: I.accept("forge_solid", "w5gkaf_c0"))
    finally:
        I.L.ROOT, I.flux.PROVENANCE = real_root, real_ledger
    assert "failed audit (A)" in stop and I.sprite_path("forge_solid").read_bytes() == before_bytes, stop
    print("ok  accept refuses a candidate that failed audit (A)")

    # L2-T09: a named human can accept a candidate that failed (A), with a reason; the override is in the provenance.
    I.L.ROOT, I.flux.PROVENANCE = pathlib.Path(tmp), pathlib.Path(tmp) / "provenance.json"
    try:
        assert "failed audit (A)" in refused(lambda: I.accept("forge_solid", "w5gkaf_c0", None, "reason"))  # no name
        with contextlib.redirect_stdout(io.StringIO()):
            I.accept("forge_solid", "w5gkaf_c0", "Guillaume", "light too flat but the camp reads well")
        kept = json.loads((pathlib.Path(tmp) / "provenance.json").read_text())["sprites/forge/solid.nuit.webp"]
    finally:
        I.L.ROOT, I.flux.PROVENANCE = real_root, real_ledger
    over = kept["human_override"]
    assert kept["accepted_by"] == "Guillaume" and over["reason"].startswith("light too flat"), kept
    assert over["audit_failed"] == ["light"] and over["date"] == time.strftime("%Y-%m-%d"), over
    assert I.sprite_path("windmill_sails").name == "windmill_sails.webp" and I.sprite_path("forge_solid").name == "solid.nuit.webp"
    I.L.ROOT, I.flux.PROVENANCE = pathlib.Path(tmp), pathlib.Path(tmp) / "provenance.json"
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            I.accept("forge_solid", "w5gka9_c0", None, None, "reviews/x.md:fail:4,9")
        rev = json.loads((pathlib.Path(tmp) / "provenance.json").read_text())["sprites/forge/solid.nuit.webp"]["review"]
    finally:
        I.L.ROOT, I.flux.PROVENANCE = real_root, real_ledger
    assert rev == {"verdict": "fail", "failed_items": ["4", "9"], "file": "reviews/x.md"}, rev
    assert "verdict must be" in refused(lambda: I.parse_review("f:maybe"))
    print("ok  accept --review writes review {verdict, failed_items, file} in the provenance")
    print("ok  sprite_path: a piece keeps its own name, a stage keeps nomImage")
    print("ok  accept --human: refused without a name, accepted with one, human_override (reason, date, failed checks) written")

print("PASS")
