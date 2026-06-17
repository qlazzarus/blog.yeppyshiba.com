#!/usr/bin/env python3
"""Extract derived analysis artifacts from docs/chicken_farm/닭농장1.3a.w3x.

This script intentionally writes summaries and tables, not the full original
JASS script or original asset files.
"""

from __future__ import annotations

import argparse
import json
import re
import struct
import zlib
from collections import Counter, defaultdict
from pathlib import Path


KNOWN_FILES = [
    "war3map.wts",
    "war3map.w3i",
    r"scripts\war3map.j",
    "war3map.w3e",
    "war3map.wpm",
    "war3map.doo",
    "war3map.w3a",
    "war3map.w3b",
    "war3map.w3d",
    "war3map.w3q",
    "war3map.w3h",
    "war3map.mmp",
    "war3map.shd",
]

FAILED_EXPECTED = [
    "(listfile)",
    "war3map.w3u",
    "war3map.w3t",
    "war3map.wtg",
    "war3map.wct",
    "war3mapUnits.doo",
]

REFERENCE_ASSETS = [
    "war3mapMap.blp",
    "war3mapPreview.tga",
    r"war3mapImported\GreenGrass_Wall.mdx",
]


def u32_to_rawcode(value: int) -> str:
    return "".join(chr((value >> shift) & 0xFF) for shift in (24, 16, 8, 0))


def rawcode_to_u32(value: str) -> int:
    data = value.encode("latin1")
    return (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]


class MPQ:
    def __init__(self, data: bytes, base: int = 1536) -> None:
        self.data = data
        self.base = base
        self.crypt = self._build_crypt_table()
        self.hash_entries = self._load_hash_table()
        self.block_entries = self._load_block_table()

    @staticmethod
    def _build_crypt_table() -> list[int]:
        table = [0] * 0x500
        seed = 0x00100001
        for i in range(0x100):
            index = i
            for _ in range(5):
                seed = (seed * 125 + 3) % 0x2AAAAB
                temp1 = (seed & 0xFFFF) << 16
                seed = (seed * 125 + 3) % 0x2AAAAB
                temp2 = seed & 0xFFFF
                table[index] = (temp1 | temp2) & 0xFFFFFFFF
                index += 0x100
        return table

    def hash_string(self, value: str, hash_type: int) -> int:
        seed1 = 0x7FED7FED
        seed2 = 0xEEEEEEEE
        normalized = value.upper().replace("/", "\\").encode("latin1")
        for ch in normalized:
            seed1 = (self.crypt[(hash_type << 8) + ch] ^ ((seed1 + seed2) & 0xFFFFFFFF)) & 0xFFFFFFFF
            seed2 = (ch + seed1 + seed2 + ((seed2 << 5) & 0xFFFFFFFF) + 3) & 0xFFFFFFFF
        return seed1

    def decrypt_words(self, raw: bytes, key: int) -> bytes:
        seed1 = key & 0xFFFFFFFF
        seed2 = 0xEEEEEEEE
        out = bytearray(raw)
        end = len(raw) // 4 * 4
        for offset in range(0, end, 4):
            seed2 = (seed2 + self.crypt[0x400 + (seed1 & 0xFF)]) & 0xFFFFFFFF
            value = struct.unpack_from("<I", out, offset)[0]
            decoded = (value ^ ((seed1 + seed2) & 0xFFFFFFFF)) & 0xFFFFFFFF
            struct.pack_into("<I", out, offset, decoded)
            seed1 = ((((~seed1) & 0xFFFFFFFF) << 21) + 0x11111111 | (seed1 >> 11)) & 0xFFFFFFFF
            seed2 = (decoded + seed2 + ((seed2 << 5) & 0xFFFFFFFF) + 3) & 0xFFFFFFFF
        return bytes(out)

    def _load_hash_table(self) -> list[tuple[int, int, int, int]]:
        raw = self.data[self.base + 0x349AF8 : self.base + 0x349AF8 + 128 * 16]
        decoded = self.decrypt_words(raw, self.hash_string("(hash table)", 3))
        return [struct.unpack_from("<4I", decoded, i * 16) for i in range(128)]

    def _load_block_table(self) -> list[tuple[int, int, int, int]]:
        raw = self.data[self.base + 0x34A2F8 : self.base + 0x34A2F8 + 91 * 16]
        decoded = self.decrypt_words(raw, self.hash_string("(block table)", 3))
        return [struct.unpack_from("<4I", decoded, i * 16) for i in range(91)]

    def lookup(self, name: str) -> tuple[int, int, int, int] | None:
        start = self.hash_string(name, 0) & 127
        hash_a = self.hash_string(name, 1)
        hash_b = self.hash_string(name, 2)
        for step in range(128):
            index = (start + step) & 127
            name_a, name_b, _locale, block_index = self.hash_entries[index]
            if name_a == 0xFFFFFFFF:
                return None
            if name_a == hash_a and name_b == hash_b and block_index < len(self.block_entries):
                return self.block_entries[block_index]
        return None

    @staticmethod
    def decompress_sector(raw: bytes, expected_size: int) -> bytes:
        if len(raw) == expected_size:
            return raw
        if not raw:
            return raw
        method = raw[0]
        payload = raw[1:]
        if method & 0x02:
            return zlib.decompress(payload)
        if method == 0:
            return payload
        raise ValueError(f"unsupported compression byte {method:#x}")

    def extract(self, name: str) -> bytes | None:
        block = self.lookup(name)
        if block is None:
            return None
        offset, compressed_size, file_size, flags = block
        raw = self.data[self.base + offset : self.base + offset + compressed_size]
        encrypted = bool(flags & 0x10000)
        compressed = bool(flags & 0x200)
        single_unit = bool(flags & 0x01000000)
        key = self.hash_string(name.split("\\")[-1], 3)

        if single_unit:
            decoded = self.decrypt_words(raw, key) if encrypted else raw
            return self.decompress_sector(decoded, file_size) if compressed else decoded[:file_size]

        if not compressed:
            decoded = self.decrypt_words(raw, key) if encrypted else raw
            return decoded[:file_size]

        for shift in range(8):
            sector_size = 512 << shift
            sectors = (file_size + sector_size - 1) // sector_size
            table_size = (sectors + 1) * 4
            if table_size > len(raw):
                continue
            table = raw[:table_size]
            if encrypted:
                table = self.decrypt_words(table, (key - 1) & 0xFFFFFFFF)
            offsets = list(struct.unpack("<" + "I" * (sectors + 1), table))
            if offsets[0] != table_size:
                continue
            if any(value < 0 or value > len(raw) for value in offsets):
                continue
            if any(offsets[i] > offsets[i + 1] for i in range(len(offsets) - 1)):
                continue

            out = bytearray()
            try:
                for i in range(sectors):
                    sector = raw[offsets[i] : offsets[i + 1]]
                    if encrypted:
                        sector = self.decrypt_words(sector, (key + i) & 0xFFFFFFFF)
                    out += self.decompress_sector(sector, min(sector_size, file_size - len(out)))
            except Exception:
                continue
            if len(out) >= file_size:
                return bytes(out[:file_size])

        raise ValueError(f"could not extract compressed file {name}")

    def extract_block_unencrypted(self, block_index: int) -> bytes | None:
        if block_index >= len(self.block_entries):
            return None
        offset, compressed_size, file_size, flags = self.block_entries[block_index]
        if not file_size or flags & 0x10000:
            return None
        raw = self.data[self.base + offset : self.base + offset + compressed_size]
        compressed = bool(flags & 0x200)
        single_unit = bool(flags & 0x01000000)
        if single_unit:
            return self.decompress_sector(raw, file_size) if compressed else raw[:file_size]
        if not compressed:
            return raw[:file_size]
        for shift in range(8):
            sector_size = 512 << shift
            sectors = (file_size + sector_size - 1) // sector_size
            table_size = (sectors + 1) * 4
            if table_size > len(raw):
                continue
            try:
                offsets = list(struct.unpack("<" + "I" * (sectors + 1), raw[:table_size]))
            except Exception:
                continue
            if offsets[0] != table_size:
                continue
            if any(value < 0 or value > len(raw) for value in offsets):
                continue
            if any(offsets[i] > offsets[i + 1] for i in range(len(offsets) - 1)):
                continue
            out = bytearray()
            try:
                for i in range(sectors):
                    out += self.decompress_sector(
                        raw[offsets[i] : offsets[i + 1]],
                        min(sector_size, file_size - len(out)),
                    )
            except Exception:
                continue
            if len(out) >= file_size:
                return bytes(out[:file_size])
        return None


def parse_wts(data: bytes) -> list[dict[str, object]]:
    text = data.decode("utf-8", "replace")
    pattern = re.compile(r"STRING\s+(\d+)\s*\{\s*(.*?)\s*\}", re.DOTALL)
    return [{"id": int(match.group(1)), "text": match.group(2)} for match in pattern.finditer(text)]


def parse_ini_sections(data: bytes) -> dict[str, dict[str, str]]:
    text = data.decode("utf-8", "replace")
    parts = re.split(r"(?m)^\[([^\]]+)\]\s*$", text)
    sections: dict[str, dict[str, str]] = {}
    for index in range(1, len(parts), 2):
        rawcode = parts[index]
        fields = {}
        for line in parts[index + 1].splitlines():
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            fields[key] = value.strip().strip('"')
        sections[rawcode] = fields
    return sections


def parse_slk(data: bytes) -> dict[str, dict[str, str]]:
    text = data.decode("utf-8", "replace")
    rows: dict[int, dict[int, str]] = defaultdict(dict)
    current_x = 0
    current_y = 0
    for line in text.splitlines():
        if not line.startswith("C;"):
            continue
        x = current_x
        y = current_y
        value = ""
        for part in line.split(";")[1:]:
            if part.startswith("X"):
                x = int(part[1:])
            elif part.startswith("Y"):
                y = int(part[1:])
            elif part.startswith("K"):
                value = part[1:]
                if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
                    value = value[1:-1]
        if x and y:
            rows[y][x] = value
            current_x = x
            current_y = y

    headers = rows.get(1, {})
    table = {}
    for y, cells in rows.items():
        if y == 1:
            continue
        rawcode = cells.get(1, "")
        if not rawcode:
            continue
        table[rawcode] = {
            headers.get(x, f"col{x}"): value
            for x, value in cells.items()
            if x != 1 and headers.get(x)
        }
    return table


def infer_role(rawcode: str, fields: dict[str, str], observations: dict[str, object]) -> str:
    name = fields.get("name") or fields.get("Name") or ""
    tip = fields.get("Tip", "")
    if rawcode in {"h00A", "h00J", "h00W"}:
        return "lumber_income_building"
    if rawcode.startswith("H01") or rawcode in {"H00X", "H012", "H013"}:
        return "boss_or_elite_enemy"
    if rawcode in {"n007", "n008", "n009"} or "울프" in name or "Wolf" in name:
        return "wolf_enemy"
    if "난이도" in name:
        return "difficulty_selector"
    if rawcode in {"H000"} or "농부" in name:
        return "player_hero"
    if "개" in name and "생산" in tip:
        return "player_defender"
    if rawcode in observations.get("created_by_player10", set()):
        return "enemy_spawn"
    if rawcode in observations.get("created_by_player11", set()):
        return "shop_or_neutral_spawn"
    return "unit_or_structure"


def build_unit_crosscheck(mpq: MPQ, jass_summary: dict[str, object]) -> dict[str, object]:
    anonymous_blocks = []
    ini_sections: dict[str, dict[str, str]] = {}
    slk_tables: dict[str, dict[str, dict[str, str]]] = {}
    slk_names = {
        84: "unit_abilities",
        85: "unit_balance",
        86: "unit_data",
        87: "unit_ui",
        88: "unit_weapons",
        89: "item_data",
    }
    for index, block in enumerate(mpq.block_entries):
        data = mpq.extract_block_unencrypted(index)
        if data is None:
            continue
        head = data[:24].decode("latin1", "replace").replace("\n", "\\n").replace("\r", "\\r")
        kind = "unknown"
        if data.startswith(b"["):
            kind = "ini_sections"
            sections = parse_ini_sections(data)
            if any(code in sections for code in ("h00A", "H012", "n002")):
                ini_sections.update(sections)
        elif data.startswith(b"ID;PWXL"):
            kind = "slk"
            if index in slk_names:
                slk_tables[slk_names[index]] = parse_slk(data)
        anonymous_blocks.append(
            {
                "block_index": index,
                "size": len(data),
                "kind": kind,
                "head": head,
            }
        )

    created_by_player10 = set()
    created_by_player11 = set()
    created_lines: dict[str, list[str]] = defaultdict(list)
    created_count: Counter[str] = Counter()
    for row in jass_summary.get("create_units", []):
        unit_expr = str(row["unit_expr"]).strip()
        if unit_expr.isdigit():
            rawcode = u32_to_rawcode(int(unit_expr))
        else:
            rawcode = unit_expr
        if len(rawcode) != 4 or not all(32 <= ord(ch) < 127 for ch in rawcode):
            continue
        created_count[rawcode] += int(row.get("count", "1"))
        created_lines[rawcode].append(str(row["line"]))
        owner = str(row["owner_expr"])
        if "Player(10)" in owner:
            created_by_player10.add(rawcode)
        if "Player(11)" in owner or "ConvertedPlayer(12)" in owner:
            created_by_player11.add(rawcode)

    observations = {
        "created_by_player10": created_by_player10,
        "created_by_player11": created_by_player11,
    }
    rawcodes = {row["rawcode"] for row in jass_summary.get("rawcodes", []) if str(row["rawcode"])[0] in "Hhneu"}
    for table_name in ("unit_abilities", "unit_balance", "unit_data", "unit_ui", "unit_weapons"):
        rawcodes.update(slk_tables.get(table_name, {}).keys())
    unit_codes = sorted(
        raw
        for raw in rawcodes
        if raw in slk_tables.get("unit_balance", {})
        or raw in slk_tables.get("unit_data", {})
        or raw in slk_tables.get("unit_weapons", {})
    )

    balance_fields = ["level", "goldcost", "lumbercost", "fmade", "fused", "HP", "manaN", "def", "defType", "spd"]
    data_fields = ["race", "prio", "threat", "movetp", "moveHeight", "turnRate", "propWin", "sight", "nsight"]
    weapon_fields = [
        "weapsOn",
        "acquire",
        "rangeN1",
        "cool1",
        "dmgplus1",
        "dice1",
        "sides1",
        "atkType1",
        "weapType1",
        "targs1",
    ]
    rows = []
    for rawcode in unit_codes:
        ini = ini_sections.get(rawcode, {})
        ui = slk_tables.get("unit_ui", {}).get(rawcode, {})
        balance = slk_tables.get("unit_balance", {}).get(rawcode, {})
        data = slk_tables.get("unit_data", {}).get(rawcode, {})
        weapons = slk_tables.get("unit_weapons", {}).get(rawcode, {})
        abilities = slk_tables.get("unit_abilities", {}).get(rawcode, {})
        fields = {**ui, **ini}
        rows.append(
            {
                "rawcode": rawcode,
                "name": ini.get("Name") or ui.get("name") or "",
                "role_inferred": infer_role(rawcode, fields, observations),
                "created_total_from_jass": created_count.get(rawcode, 0),
                "create_lines": ",".join(created_lines.get(rawcode, [])[:8]),
                "income_lumber_30s": {"h00A": 70, "h00J": 110, "h00W": 170}.get(rawcode, ""),
                "upgrade_to": ini.get("Upgrade", ""),
                "requires": ",".join(filter(None, [ini.get("Requires", ""), ini.get("Requires1", ""), ini.get("Requires2", "")])),
                "builds": ini.get("Builds", ""),
                "trains": ini.get("Trains", ""),
                "abil_list": abilities.get("abilList", ""),
                "hero_abil_list": abilities.get("heroAbilList", ""),
                "art": ini.get("Art") or ui.get("Art", ""),
                "model": ui.get("file", ""),
                **{field: balance.get(field, "") for field in balance_fields},
                **{field: data.get(field, "") for field in data_fields},
                **{field: weapons.get(field, "") for field in weapon_fields},
                "stat_source": "anonymous MPQ SLK/INI + JASS crosscheck",
            }
        )

    return {
        "anonymous_blocks": anonymous_blocks,
        "rows": rows,
        "slk_table_counts": {name: len(table) for name, table in slk_tables.items()},
        "ini_section_count": len(ini_sections),
    }


def split_jass_functions(jass: str) -> dict[str, str]:
    functions: dict[str, str] = {}
    pattern = re.compile(r"^function\s+(\w+)\s+takes\b", re.MULTILINE)
    matches = list(pattern.finditer(jass))
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(jass)
        functions[match.group(1)] = jass[start:end]
    return functions


def split_jass_function_blocks(jass: str) -> list[dict[str, object]]:
    offsets = line_number_offsets(jass)
    pattern = re.compile(r"^function\s+(\w+)\s+takes\b", re.MULTILINE)
    matches = list(pattern.finditer(jass))
    blocks = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(jass)
        body = jass[start:end]
        blocks.append(
            {
                "function": match.group(1),
                "line_start": line_for_offset(offsets, start),
                "line_end": line_for_offset(offsets, max(start, end - 1)),
                "body": body,
                "calls": sorted(set(re.findall(r"\bcall\s+(\w+)\s*\(", body))),
            }
        )
    return blocks


LABEL_RULES = {
    "wave": [
        "늑대",
        "Ili[",
        "Player(10)",
        "CreateNUnitsAtLoc(2,iIi",
        "IssuePointOrderLocBJ",
        "CountUnitsInGroup(lIliII(Player(10)",
        "SetPlayerTechResearchedSwap(1382573683",
    ],
    "economy": [
        "AdjustPlayerStateBJ",
        "PLAYER_STATE_RESOURCE",
        "CountLivingPlayerUnitsOfTypeId(1747988545",
        "CountLivingPlayerUnitsOfTypeId(1747988554",
        "CountLivingPlayerUnitsOfTypeId(1747988567",
        "만큼 나무",
        "충분한 금화",
        "충분한 목재",
    ],
    "disease": [
        "질병",
        "Ili[60]",
        "1747988805",
        "1747988806",
        "PLAYER_NEUTRAL_AGGRESSIVE",
    ],
    "chat": [
        "TriggerRegisterPlayerChatEvent",
        "GetEventPlayerChatString",
        "SubStringBJ(GetEventPlayerChatString",
        "DisplayTextToForce",
        "채팅",
        "-이름",
        "-모두",
        "-전체",
        "-hostban",
    ],
    "alliance": [
        "동맹",
        "SetPlayerAllianceStateBJ",
        "bj_ALLIANCE",
        "ForceEnumAllies",
        "lIlilI(GetTriggerPlayer",
        "-올동맹",
        "-동맹상태",
        "-동맹",
    ],
}


def label_jass_functions(jass: str) -> dict[str, object]:
    blocks = split_jass_function_blocks(jass)
    by_name = {str(block["function"]): block for block in blocks}
    direct: dict[str, set[str]] = {str(block["function"]): set() for block in blocks}
    reasons: dict[str, list[str]] = {str(block["function"]): [] for block in blocks}

    for block in blocks:
        name = str(block["function"])
        body = str(block["body"])
        for label, needles in LABEL_RULES.items():
            matched = [needle for needle in needles if needle in body]
            if matched:
                direct[name].add(label)
                reasons[name].extend(f"{label}:{needle}" for needle in matched[:5])

    inherited: dict[str, set[str]] = {str(block["function"]): set() for block in blocks}
    reverse_edges: defaultdict[str, set[str]] = defaultdict(set)
    for block in blocks:
        caller = str(block["function"])
        for callee in block["calls"]:
            reverse_edges[callee].add(caller)

    for callee, labels in direct.items():
        if not labels:
            continue
        for caller in reverse_edges.get(callee, set()):
            inherited[caller].update(labels)
            for label in labels:
                reasons[caller].append(f"calls:{callee}:{label}")

    rows = []
    for block in blocks:
        name = str(block["function"])
        labels = sorted(direct[name] | inherited[name])
        if not labels:
            continue
        rows.append(
            {
                "function": name,
                "line_start": block["line_start"],
                "line_end": block["line_end"],
                "labels": ",".join(labels),
                "direct_labels": ",".join(sorted(direct[name])),
                "inherited_labels": ",".join(sorted(inherited[name] - direct[name])),
                "call_count": len(block["calls"]),
                "calls": ",".join(block["calls"][:20]),
                "reasons": "|".join(reasons[name][:20]),
            }
        )

    label_summary = []
    for label in LABEL_RULES:
        labeled = [row for row in rows if label in str(row["labels"]).split(",")]
        direct_count = sum(1 for row in rows if label in str(row["direct_labels"]).split(","))
        inherited_count = sum(1 for row in rows if label in str(row["inherited_labels"]).split(","))
        label_summary.append(
            {
                "label": label,
                "function_count": len(labeled),
                "direct_count": direct_count,
                "inherited_count": inherited_count,
                "first_functions": ",".join(str(row["function"]) for row in labeled[:12]),
            }
        )

    labeled_call_edges = []
    label_by_function = {str(row["function"]): str(row["labels"]) for row in rows}
    for block in blocks:
        caller = str(block["function"])
        caller_labels = label_by_function.get(caller, "")
        for callee in block["calls"]:
            callee_labels = label_by_function.get(callee, "")
            if caller_labels or callee_labels:
                labeled_call_edges.append(
                    {
                        "caller": caller,
                        "callee": callee,
                        "caller_labels": caller_labels,
                        "callee_labels": callee_labels,
                    }
                )

    return {
        "rows": rows,
        "summary": label_summary,
        "edges": labeled_call_edges,
    }


DAY_NIGHT_RULE_APIS = [
    "TriggerRegisterGameStateEventTimeOfDay",
    "SetDayNightModels",
    "SetAmbientDaySound",
    "SetAmbientNightSound",
]

STAT_AFFECTING_APIS = [
    "SetUnitMoveSpeed",
    "SetUnitState",
    "SetUnitLifePercentBJ",
    "SetHeroLevelBJ",
    "SetPlayerTechResearchedSwap",
    "UnitAddAbilityBJ",
    "UnitRemoveAbilityBJ",
]

WOLF_RAWCODE_DECIMALS = {
    "n007": rawcode_to_u32("n007"),
    "n008": rawcode_to_u32("n008"),
    "n009": rawcode_to_u32("n009"),
    "n00A": rawcode_to_u32("n00A"),
    "n00B": rawcode_to_u32("n00B"),
    "n00C": rawcode_to_u32("n00C"),
    "n00G": rawcode_to_u32("n00G"),
    "n00I": rawcode_to_u32("n00I"),
    "n00J": rawcode_to_u32("n00J"),
    "n00K": rawcode_to_u32("n00K"),
    "n00L": rawcode_to_u32("n00L"),
    "H012": rawcode_to_u32("H012"),
    "H00X": rawcode_to_u32("H00X"),
    "H013": rawcode_to_u32("H013"),
    "H01B": rawcode_to_u32("H01B"),
    "H01N": rawcode_to_u32("H01N"),
}


def collect_day_night_wolf_stat_analysis(jass: str) -> dict[str, list[dict[str, object]]]:
    blocks = split_jass_function_blocks(jass)
    by_name = {str(block["function"]): block for block in blocks}
    lines = jass.splitlines()

    registrations = []
    register_pattern = re.compile(
        r"TriggerRegisterGameStateEventTimeOfDay\((\w+),(\w+),([0-9.]+)\)"
    )
    action_pattern = re.compile(r"TriggerAddAction\((\w+),function\s+(\w+)\)")

    trigger_actions: dict[str, list[str]] = defaultdict(list)
    for line in lines:
        action_match = action_pattern.search(line)
        if action_match:
            trigger_actions[action_match.group(1)].append(action_match.group(2))

    for index, line in enumerate(lines, start=1):
        register_match = register_pattern.search(line)
        if not register_match:
            continue

        trigger, comparator, value = register_match.groups()
        actions = trigger_actions.get(trigger, [])
        for action in actions or [""]:
            block = by_name.get(action)
            body = str(block["body"]) if block else ""
            calls = list(block["calls"]) if block else []
            stat_calls = [api for api in STAT_AFFECTING_APIS if api in body]
            wolf_refs = [
                rawcode
                for rawcode, decimal in WOLF_RAWCODE_DECIMALS.items()
                if rawcode in body or str(decimal) in body
            ]
            registrations.append(
                {
                    "line": index,
                    "trigger": trigger,
                    "comparator": comparator,
                    "time_of_day": value,
                    "action_function": action,
                    "action_line_start": block["line_start"] if block else "",
                    "action_line_end": block["line_end"] if block else "",
                    "action_calls": ",".join(calls),
                    "stat_affecting_calls": ",".join(stat_calls),
                    "wolf_rawcode_refs": ",".join(wolf_refs),
                    "inferred_effect": infer_day_night_effect(calls, stat_calls, wolf_refs),
                }
            )

    candidates = []
    day_night_functions = {
        str(row["action_function"]) for row in registrations if row.get("action_function")
    }
    for block in blocks:
        name = str(block["function"])
        body = str(block["body"])
        calls = list(block["calls"])
        stat_calls = [api for api in STAT_AFFECTING_APIS if api in body]
        if not stat_calls:
            continue

        wolf_refs = [
            rawcode
            for rawcode, decimal in WOLF_RAWCODE_DECIMALS.items()
            if rawcode in body or str(decimal) in body
        ]
        player10 = "Player(10)" in body
        time_linked = name in day_night_functions
        candidates.append(
            {
                "function": name,
                "line_start": block["line_start"],
                "line_end": block["line_end"],
                "stat_affecting_calls": ",".join(stat_calls),
                "calls": ",".join(calls[:16]),
                "player10_ref": "yes" if player10 else "no",
                "wolf_rawcode_refs": ",".join(wolf_refs),
                "registered_time_of_day_action": "yes" if time_linked else "no",
                "night_wolf_stat_link_confidence": infer_night_wolf_stat_confidence(
                    time_linked, stat_calls, wolf_refs, player10
                ),
            }
        )

    return {"registrations": registrations, "stat_candidates": candidates}


def infer_day_night_effect(calls: list[str], stat_calls: list[str], wolf_refs: list[str]) -> str:
    if stat_calls and wolf_refs:
        return "time-of-day action directly touches wolf/stat APIs"
    if stat_calls:
        return "time-of-day action has stat-affecting API but no wolf rawcode reference"
    if any(call in {"PlaySoundBJ", "KillSoundWhenDoneBJ"} for call in calls):
        return "audio cue only in extracted action"
    return "no direct stat effect observed"


def infer_night_wolf_stat_confidence(
    time_linked: bool, stat_calls: list[str], wolf_refs: list[str], player10: bool
) -> str:
    if time_linked and stat_calls and wolf_refs:
        return "high"
    if time_linked and stat_calls and player10:
        return "medium"
    if time_linked and stat_calls:
        return "low"
    if stat_calls and wolf_refs:
        return "not_time_linked"
    return "none"


def line_number_offsets(text: str) -> list[int]:
    offsets = [0]
    for match in re.finditer("\n", text):
        offsets.append(match.end())
    return offsets


def line_for_offset(offsets: list[int], pos: int) -> int:
    lo = 0
    hi = len(offsets)
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if offsets[mid] <= pos:
            lo = mid
        else:
            hi = mid
    return lo + 1


def collect_pattern_rows(jass: str, pattern: str, columns: list[str]) -> list[dict[str, object]]:
    offsets = line_number_offsets(jass)
    rows: list[dict[str, object]] = []
    for match in re.finditer(pattern, jass):
        row: dict[str, object] = {"line": line_for_offset(offsets, match.start())}
        for column, value in zip(columns, match.groups()):
            row[column] = value
        rows.append(row)
    return rows


def decode_decimal_rawcode_expr(expr: str) -> str:
    expr = expr.strip()
    if not expr.isdigit():
        return ""
    try:
        rawcode = u32_to_rawcode(int(expr))
    except Exception:
        return ""
    if all(32 <= ord(ch) < 127 for ch in rawcode):
        return rawcode
    return ""


def collect_jass_wolf_order_analysis(jass: str) -> dict[str, list[dict[str, object]]]:
    offsets = line_number_offsets(jass)
    blocks = split_jass_function_blocks(jass)
    block_by_name = {str(block["function"]): block for block in blocks}

    rects: dict[str, dict[str, object]] = {}
    for match in re.finditer(
        r"set\s+(\w+)\s*=\s*Rect\(([-0-9.]+),([-0-9.]+),([-0-9.]+),([-0-9.]+)\)",
        jass,
    ):
        rects[match.group(1)] = {
            "rect_symbol": match.group(1),
            "line": line_for_offset(offsets, match.start()),
            "min_x": match.group(2),
            "min_y": match.group(3),
            "max_x": match.group(4),
            "max_y": match.group(5),
        }

    spawn_rect_symbols: dict[int, str] = {}
    for match in re.finditer(r"set\s+Iii\[(\d+)\]\s*=\s*(\w+)", jass):
        spawn_rect_symbols[int(match.group(1))] = match.group(2)

    wolf_tier_rows = []
    for match in re.finditer(r"set\s+iIi\[(\d+)\]\s*=\s*(\d+)", jass):
        tier = int(match.group(1))
        decimal = match.group(2)
        wolf_tier_rows.append(
            {
                "tier_index": tier,
                "rawcode": decode_decimal_rawcode_expr(decimal),
                "decimal": decimal,
                "line": line_for_offset(offsets, match.start()),
            }
        )
    wolf_tier_rows.sort(key=lambda row: int(row["tier_index"]))

    spawn_point_rows = []
    for index, symbol in sorted(spawn_rect_symbols.items()):
        rect = rects.get(symbol, {})
        spawn_point_rows.append(
            {
                "spawn_index": index,
                "rect_symbol": symbol,
                "line": rect.get("line", ""),
                "min_x": rect.get("min_x", ""),
                "min_y": rect.get("min_y", ""),
                "max_x": rect.get("max_x", ""),
                "max_y": rect.get("max_y", ""),
                "center_x": (
                    (float(rect["min_x"]) + float(rect["max_x"])) / 2 if rect else ""
                ),
                "center_y": (
                    (float(rect["min_y"]) + float(rect["max_y"])) / 2 if rect else ""
                ),
                "role_inferred": "wolf_spawn_rect",
            }
        )

    attack_rect = rects.get("IlIlI", {})
    difficulty_rect = rects.get("IliiI", {})
    boss_rect = rects.get("IlilI", {})

    def function_line(name: str, key: str) -> object:
        block = block_by_name.get(name)
        return block.get(key, "") if block else ""

    order_rows = [
        {
            "function": "IliiIII",
            "line_start": function_line("IliiIII", "line_start"),
            "line_end": function_line("IliiIII", "line_end"),
            "flow_type": "spawn_rect_enter_attack",
            "trigger_source": "IIIiII enter 13 spawn rects; condition owner == Player(10)",
            "unit_scope": "GetTriggerUnit",
            "unit_filter": "Player(10)",
            "order_api": "IssuePointOrderLocBJ",
            "order_string": "attack",
            "target_expr": "GetRandomLocInRect(IlIlI)",
            "target_area": "IlIlI",
            "min_x": attack_rect.get("min_x", ""),
            "min_y": attack_rect.get("min_y", ""),
            "max_x": attack_rect.get("max_x", ""),
            "max_y": attack_rect.get("max_y", ""),
            "radius": "",
            "target_priority_inferred": "random point inside broad attack rectangle; no explicit building/chicken/farmer priority in JASS",
            "mvp_translation": "on enemy spawn or spawn-zone entry, set primary intent to attack into the farm play area; let engine/AI acquire concrete targets",
            "confidence": "high",
        },
        {
            "function": "IliiIlI -> IliiIiI",
            "line_start": function_line("IliiIlI", "line_start"),
            "line_end": function_line("IliiIlI", "line_end"),
            "flow_type": "periodic_global_attack_refresh",
            "trigger_source": "IIIiiI periodic timer 60.00",
            "unit_scope": "ForGroupBJ(lIlIiI(Player(10)))",
            "unit_filter": "all Player(10) units",
            "order_api": "IssuePointOrderLocBJ",
            "order_string": "attack",
            "target_expr": "GetRandomLocInRect(IlIlI)",
            "target_area": "IlIlI",
            "min_x": attack_rect.get("min_x", ""),
            "min_y": attack_rect.get("min_y", ""),
            "max_x": attack_rect.get("max_x", ""),
            "max_y": attack_rect.get("max_y", ""),
            "radius": "",
            "target_priority_inferred": "global attack-move refresh to random play-area points; concrete target selection left to Warcraft attack-move behavior",
            "mvp_translation": "periodically refresh wolves that are idle/stuck toward a random valuable farm-area point",
            "confidence": "high",
        },
        {
            "function": "llIIIi -> lillli",
            "line_start": function_line("llIIIi", "line_start"),
            "line_end": function_line("llIIIi", "line_end"),
            "flow_type": "boss_or_special_focus_position",
            "trigger_source": "attacked-event branch; condition nearby Player(10) units",
            "unit_scope": "ForGroupBJ(lIiiII(6000, GetUnitLoc(GetTriggerUnit()), Player(10) filter))",
            "unit_filter": "Player(10) units near trigger unit",
            "order_api": "IssuePointOrderLocBJ",
            "order_string": "attack",
            "target_expr": "GetUnitLoc(GetTriggerUnit())",
            "target_area": "trigger_unit_position",
            "min_x": "",
            "min_y": "",
            "max_x": "",
            "max_y": "",
            "radius": "6000",
            "target_priority_inferred": "nearby enemy units are pulled toward a special attacked unit position; not ordinary wolf pathing",
            "mvp_translation": "optional boss aggro pulse; do not use for ordinary wolves unless recreating special boss behavior",
            "confidence": "medium",
        },
        {
            "function": "lIlIIiI -> lIlIIII",
            "line_start": function_line("lIlIIiI", "line_start"),
            "line_end": function_line("lIlIIiI", "line_end"),
            "flow_type": "low_hp_defender_taunt",
            "trigger_source": "EVENT_PLAYER_UNIT_ATTACKED; trigger unit type n00E and life <= 10%",
            "unit_scope": "ForGroupBJ(lIiliI(800, GetUnitLoc(GetTriggerUnit())))",
            "unit_filter": "enemy units near trigger unit",
            "order_api": "IssueTargetOrderBJ",
            "order_string": "attack",
            "target_expr": "iIiiiI[playerId] = GetTriggerUnit()",
            "target_area": "trigger_unit_position",
            "min_x": "",
            "min_y": "",
            "max_x": "",
            "max_y": "",
            "radius": "800",
            "target_priority_inferred": "forced focus on low-HP big dog/defender unit; special taunt/survival behavior, not baseline wolf target priority",
            "mvp_translation": "optional defender taunt ability; baseline wolves should still use Warsmash-style acquisition/pathing",
            "confidence": "medium",
        },
        {
            "function": "llIliI -> llIlII",
            "line_start": function_line("llIliI", "line_start"),
            "line_end": function_line("llIliI", "line_end"),
            "flow_type": "manual_tank_focus",
            "trigger_source": "tank marker variable ilIi",
            "unit_scope": "ForGroupBJ(lIiiII(1200, GetUnitLoc(GetAttacker()), filter unit == ilIi))",
            "unit_filter": "specific marked tank unit",
            "order_api": "IssueTargetOrderBJ",
            "order_string": "attack",
            "target_expr": "GetEnumUnit()",
            "target_area": "attacker_neighborhood",
            "min_x": "",
            "min_y": "",
            "max_x": "",
            "max_y": "",
            "radius": "1200",
            "target_priority_inferred": "manual tank recognition makes attacker focus marked tank; special player command flow",
            "mvp_translation": "optional future aggro marker; not needed for MVP wolf baseline",
            "confidence": "low",
        },
    ]

    spawn_summary_rows = []
    for match in re.finditer(
        r"call\s+CreateNUnitsAtLoc\((\d+),(\d+),Player\(10\),GetRectCenter\((\w+)\),",
        jass,
    ):
        rawcode = decode_decimal_rawcode_expr(match.group(2))
        if rawcode not in {
            "H012",
            "H00X",
            "H013",
            "H01B",
            "H01N",
            "H01O",
            "n018",
            "n00N",
            "n00O",
            "n00P",
            "n00S",
            "n00T",
            "n019",
        }:
            continue
        rect_symbol = match.group(3)
        rect = rects.get(rect_symbol, {})
        spawn_summary_rows.append(
            {
                "line": line_for_offset(offsets, match.start()),
                "count": match.group(1),
                "rawcode": rawcode,
                "decimal": match.group(2),
                "owner": "Player(10)",
                "rect_symbol": rect_symbol,
                "center_x": (
                    (float(rect["min_x"]) + float(rect["max_x"])) / 2 if rect else ""
                ),
                "center_y": (
                    (float(rect["min_y"]) + float(rect["max_y"])) / 2 if rect else ""
                ),
                "role_inferred": "boss_or_difficulty_spawn",
            }
        )

    return {
        "order_flows": order_rows,
        "spawn_points": spawn_point_rows,
        "wolf_tiers": wolf_tier_rows,
        "special_spawns": spawn_summary_rows,
        "areas": [
            {
                "symbol": "IlIlI",
                "role_inferred": "global_wolf_attack_random_rect",
                **attack_rect,
            },
            {
                "symbol": "IliiI",
                "role_inferred": "difficulty_modifier_spawn_rect",
                **difficulty_rect,
            },
            {
                "symbol": "IlilI",
                "role_inferred": "boss_spawn_rect",
                **boss_rect,
            },
        ],
    }


def summarize_jass(data: bytes) -> dict[str, object]:
    jass = data.decode("utf-8", "replace").replace("\r", "\n")
    functions = split_jass_functions(jass)
    call_graph: list[dict[str, object]] = []
    for name, body in functions.items():
        callees = sorted(set(re.findall(r"\bcall\s+(\w+)\s*\(", body)))
        if callees:
            call_graph.append({"function": name, "calls": callees})

    timers = []
    timers += collect_pattern_rows(
        jass,
        r"TriggerRegisterTimerEventSingle\((\w+),([0-9.]+)\)",
        ["trigger", "seconds"],
    )
    timers += collect_pattern_rows(
        jass,
        r"TriggerRegisterTimerEventPeriodic\((\w+),([0-9.]+)\)",
        ["trigger", "seconds"],
    )
    timers += collect_pattern_rows(
        jass,
        r"TriggerRegisterTimerExpireEventBJ\((\w+),CreateTimerBJ\(true,([0-9.]+)\)\)",
        ["trigger", "seconds"],
    )

    economy = collect_pattern_rows(
        jass,
        r"AdjustPlayerStateBJ\((.*?)\,(.*?)\,(PLAYER_STATE_RESOURCE_\w+)\)",
        ["amount_expr", "player_expr", "resource"],
    )
    scores = []
    lines = jass.splitlines()
    for index, line in enumerate(lines):
        if "점을 얻으셨습니다" not in line:
            continue
        context = "\n".join(lines[max(0, index - 3) : index + 1])
        point_match = re.search(r"\+([0-9]+)\)", context)
        message_match = re.search(r'"([^"]*점을 얻으셨습니다\.)"', line)
        scores.append(
            {
                "line": index + 1,
                "points": point_match.group(1) if point_match else "",
                "message": message_match.group(1) if message_match else line.strip(),
            }
        )
    create_units = collect_pattern_rows(
        jass,
        r"CreateNUnitsAtLoc(?:FacingLocBJ)?\((\d+),([^,]+),([^,]+),",
        ["count", "unit_expr", "owner_expr"],
    )

    rawcodes: dict[str, int] = {}
    for value in re.findall(r"\b([0-9]{10})\b", jass):
        number = int(value)
        raw = u32_to_rawcode(number)
        if all(32 <= ord(ch) < 127 for ch in raw):
            rawcodes[raw] = number

    return {
        "function_count": len(functions),
        "line_count": len(jass.splitlines()),
        "call_graph": call_graph,
        "timers": sorted(timers, key=lambda row: (float(row["seconds"]), int(row["line"]))),
        "economy": economy,
        "scores": scores,
        "create_units": create_units,
        "rawcodes": [
            {"rawcode": raw, "decimal": number}
            for raw, number in sorted(rawcodes.items(), key=lambda item: item[0])
        ],
        "start_locations": collect_pattern_rows(
            jass,
            r"DefineStartLocation\((\d+),([-0-9.]+),([-0-9.]+)\)",
            ["slot", "x", "y"],
        ),
    }


class BinaryReader:
    def __init__(self, data: bytes) -> None:
        self.data = data
        self.pos = 0

    def read_i32(self) -> int:
        value = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        return value

    def read_u32(self) -> int:
        value = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return value

    def read_rawcode(self) -> str:
        raw = self.data[self.pos : self.pos + 4]
        self.pos += 4
        if raw == b"\x00\x00\x00\x00":
            return ""
        return raw.decode("latin1")

    def read_f32(self) -> float:
        value = struct.unpack_from("<f", self.data, self.pos)[0]
        self.pos += 4
        return value

    def read_cstring(self) -> str:
        end = self.data.find(b"\x00", self.pos)
        if end < 0:
            raise ValueError("unterminated cstring")
        raw = self.data[self.pos : end]
        self.pos = end + 1
        return raw.decode("utf-8", "replace")

    def remaining(self) -> int:
        return len(self.data) - self.pos


def parse_object_mods(data: bytes) -> dict[str, object]:
    reader = BinaryReader(data)
    result: dict[str, object] = {"version": reader.read_i32(), "tables": []}
    for table_name in ("original", "custom"):
        count = reader.read_u32()
        objects = []
        for _ in range(count):
            old_id = reader.read_rawcode()
            new_id = reader.read_rawcode()
            mod_count = reader.read_u32()
            mods = []
            for _ in range(mod_count):
                mod_id = reader.read_rawcode()
                value_type = reader.read_u32()
                level_or_variation = reader.read_u32()
                data_pointer = reader.read_u32()
                if value_type == 0:
                    value: object = reader.read_i32()
                elif value_type in (1, 2):
                    value = reader.read_f32()
                elif value_type == 3:
                    value = reader.read_cstring()
                else:
                    value = f"<unsupported:{value_type}>"
                terminator = reader.read_rawcode()
                mods.append(
                    {
                        "field": mod_id,
                        "type": value_type,
                        "level_or_variation": level_or_variation,
                        "data_pointer": data_pointer,
                        "value": value,
                        "terminator": terminator,
                    }
                )
            objects.append({"old_id": old_id, "new_id": new_id, "mod_count": mod_count, "mods": mods[:20]})
        result["tables"].append({"name": table_name, "object_count": count, "objects": objects})
    result["remaining_bytes"] = reader.remaining()
    return result


def parse_doo(data: bytes) -> dict[str, object]:
    reader = BinaryReader(data)
    magic = data[:4].decode("latin1")
    reader.pos = 4
    version = reader.read_u32()
    subversion = reader.read_u32()
    doodad_count = reader.read_u32()
    doodads = []

    for index in range(doodad_count):
        rawcode = reader.read_rawcode()
        variation = reader.read_u32()
        x = reader.read_f32()
        y = reader.read_f32()
        z = reader.read_f32()
        angle = reader.read_f32()
        scale_x = reader.read_f32()
        scale_y = reader.read_f32()
        scale_z = reader.read_f32()
        flags = data[reader.pos]
        reader.pos += 1
        life = data[reader.pos]
        reader.pos += 1
        item_table_pointer = reader.read_i32()
        item_set_count = reader.read_u32()
        item_sets = []
        for _ in range(item_set_count):
            item_count = reader.read_u32()
            items = []
            for _ in range(item_count):
                items.append({"item_id": reader.read_rawcode(), "chance": reader.read_u32()})
            item_sets.append(items)
        editor_id = reader.read_u32()
        doodads.append(
            {
                "index": index,
                "rawcode": rawcode,
                "variation": variation,
                "x": round(x, 3),
                "y": round(y, 3),
                "z": round(z, 3),
                "angle_rad": round(angle, 6),
                "scale_x": round(scale_x, 3),
                "scale_y": round(scale_y, 3),
                "scale_z": round(scale_z, 3),
                "flags": flags,
                "life": life,
                "item_table_pointer": item_table_pointer,
                "item_set_count": item_set_count,
                "editor_id": editor_id,
            }
        )

    special_count = 0
    special = []
    if reader.remaining() >= 4:
        special_count = reader.read_u32()
        for index in range(special_count):
            if reader.remaining() < 16:
                break
            special.append(
                {
                    "index": index,
                    "rawcode": reader.read_rawcode(),
                    "z": round(reader.read_f32(), 3),
                    "x": round(reader.read_f32(), 3),
                    "y": round(reader.read_f32(), 3),
                }
            )

    return {
        "magic": magic,
        "version": version,
        "subversion": subversion,
        "doodad_count": doodad_count,
        "doodads": doodads,
        "special_count": special_count,
        "special_doodads": special,
        "remaining_bytes": reader.remaining(),
    }


def parse_w3e(data: bytes) -> dict[str, object]:
    reader = BinaryReader(data)
    magic = data[:4].decode("latin1")
    reader.pos = 4
    version = reader.read_u32()
    tileset = data[reader.pos : reader.pos + 1].decode("latin1")
    reader.pos += 1
    custom_tileset = reader.read_u32()
    ground_count = reader.read_u32()
    ground_tiles = [reader.read_rawcode() for _ in range(ground_count)]
    cliff_count = reader.read_u32()
    cliff_tiles = [reader.read_rawcode() for _ in range(cliff_count)]
    width = reader.read_u32()
    height = reader.read_u32()
    offset_x = reader.read_f32()
    offset_y = reader.read_f32()

    tiles = []
    for row in range(height):
        for col in range(width):
            ground_raw = reader.read_u32() & 0xFFFF
            # read_u32 advanced too far, so rewind 2 bytes to read the next short.
            reader.pos -= 2
            water_raw = reader.read_u32() & 0xFFFF
            reader.pos -= 2
            flags = data[reader.pos]
            texture = data[reader.pos + 1]
            cliff = data[reader.pos + 2]
            reader.pos += 3
            ground_index = texture & 0x0F
            texture_variant = texture >> 4
            cliff_index = cliff & 0x0F
            layer_height = cliff >> 4
            tiles.append(
                {
                    "row": row,
                    "col": col,
                    "x": round(offset_x + col * 128.0, 3),
                    "y": round(offset_y + row * 128.0, 3),
                    "ground_height_raw": ground_raw,
                    "ground_height": round((ground_raw - 8192) / 4.0, 3),
                    "water_level_raw": water_raw,
                    "water_level": round((water_raw - 8192) / 4.0, 3),
                    "flags": flags,
                    "texture": texture,
                    "ground_index": ground_index,
                    "ground_tile": ground_tiles[ground_index] if ground_index < len(ground_tiles) else "",
                    "texture_variant": texture_variant,
                    "cliff": cliff,
                    "cliff_index": cliff_index,
                    "cliff_tile": cliff_tiles[cliff_index] if cliff_index < len(cliff_tiles) else "",
                    "layer_height": layer_height,
                }
            )

    return {
        "magic": magic,
        "version": version,
        "tileset": tileset,
        "custom_tileset": custom_tileset,
        "ground_tiles": ground_tiles,
        "cliff_tiles": cliff_tiles,
        "width": width,
        "height": height,
        "offset_x": offset_x,
        "offset_y": offset_y,
        "tiles": tiles,
        "remaining_bytes": reader.remaining(),
    }


def nearest_w3e_tile(w3e: dict[str, object], x: float, y: float) -> dict[str, object]:
    col = round((x - float(w3e["offset_x"])) / 128.0)
    row = round((y - float(w3e["offset_y"])) / 128.0)
    col = max(0, min(int(w3e["width"]) - 1, col))
    row = max(0, min(int(w3e["height"]) - 1, row))
    return w3e["tiles"][row * int(w3e["width"]) + col]


def summarize_w3e(w3e: dict[str, object], start_locations: list[dict[str, object]]) -> dict[str, object]:
    tiles = w3e["tiles"]
    ground_counts = Counter(tile["ground_tile"] or f"index:{tile['ground_index']}" for tile in tiles)
    texture_counts = Counter(tile["texture"] for tile in tiles)
    flag_counts = Counter(tile["flags"] for tile in tiles)
    cliff_counts = Counter(tile["cliff_tile"] or f"index:{tile['cliff_index']}" for tile in tiles)
    heights = [float(tile["ground_height"]) for tile in tiles]
    water = [float(tile["water_level"]) for tile in tiles]
    start_rows = []
    for loc in start_locations:
        sx = float(loc["x"])
        sy = float(loc["y"])
        nearest = nearest_w3e_tile(w3e, sx, sy)
        nearby = []
        for tile in tiles:
            dx = float(tile["x"]) - sx
            dy = float(tile["y"]) - sy
            dist2 = dx * dx + dy * dy
            if dist2 <= 1024 * 1024:
                nearby.append(tile)
        ground_near = Counter(tile["ground_tile"] or f"index:{tile['ground_index']}" for tile in nearby)
        flags_near = Counter(tile["flags"] for tile in nearby)
        hvals = [float(tile["ground_height"]) for tile in nearby]
        start_rows.append(
            {
                "slot": loc["slot"],
                "start_x": sx,
                "start_y": sy,
                "nearest_row": nearest["row"],
                "nearest_col": nearest["col"],
                "nearest_ground_tile": nearest["ground_tile"] or f"index:{nearest['ground_index']}",
                "nearest_texture": nearest["texture"],
                "nearest_flags": nearest["flags"],
                "nearest_height": nearest["ground_height"],
                "tiles_in_1024": len(nearby),
                "avg_height_1024": round(sum(hvals) / len(hvals), 3) if hvals else None,
                "min_height_1024": min(hvals) if hvals else None,
                "max_height_1024": max(hvals) if hvals else None,
                "dominant_ground_1024": ground_near.most_common(1)[0][0] if ground_near else "",
                "dominant_ground_count_1024": ground_near.most_common(1)[0][1] if ground_near else 0,
                "dominant_flags_1024": flags_near.most_common(1)[0][0] if flags_near else "",
                "dominant_flags_count_1024": flags_near.most_common(1)[0][1] if flags_near else 0,
            }
        )

    return {
        "header": {
            "magic": w3e["magic"],
            "version": w3e["version"],
            "tileset": w3e["tileset"],
            "custom_tileset": w3e["custom_tileset"],
            "width": w3e["width"],
            "height": w3e["height"],
            "offset_x": w3e["offset_x"],
            "offset_y": w3e["offset_y"],
            "remaining_bytes": w3e["remaining_bytes"],
        },
        "ground_tiles": w3e["ground_tiles"],
        "cliff_tiles": w3e["cliff_tiles"],
        "height": {
            "min": min(heights),
            "max": max(heights),
            "avg": round(sum(heights) / len(heights), 3),
        },
        "water_level": {
            "min": min(water),
            "max": max(water),
            "avg": round(sum(water) / len(water), 3),
        },
        "ground_counts": [{"ground_tile": key, "count": value} for key, value in ground_counts.most_common()],
        "texture_counts": [{"texture": key, "count": value} for key, value in texture_counts.most_common()],
        "flag_counts": [{"flags": key, "count": value} for key, value in flag_counts.most_common()],
        "cliff_counts": [{"cliff_tile": key, "count": value} for key, value in cliff_counts.most_common()],
        "start_terrain": start_rows,
    }


def parse_wpm(data: bytes, offset_x: float = -3072.0, offset_y: float = -7680.0) -> dict[str, object]:
    reader = BinaryReader(data)
    magic = data[:4].decode("latin1")
    reader.pos = 4
    version = reader.read_u32()
    width = reader.read_u32()
    height = reader.read_u32()
    cells = []
    for row in range(height):
        for col in range(width):
            flags = data[reader.pos]
            reader.pos += 1
            cells.append(
                {
                    "row": row,
                    "col": col,
                    "x": round(offset_x + col * 32.0, 3),
                    "y": round(offset_y + row * 32.0, 3),
                    "flags": flags,
                    "hex": f"0x{flags:02X}",
                    "ground_blocked": bool(flags & 0x02),
                    "build_blocked": bool(flags & 0x08),
                    "bit_0x40": bool(flags & 0x40),
                    "bit_0x80": bool(flags & 0x80),
                }
            )
    return {
        "magic": magic,
        "version": version,
        "width": width,
        "height": height,
        "offset_x": offset_x,
        "offset_y": offset_y,
        "cell_size": 32.0,
        "cells": cells,
        "remaining_bytes": reader.remaining(),
    }


def wpm_cell_for_xy(wpm: dict[str, object], x: float, y: float) -> tuple[int, int]:
    col = round((x - float(wpm["offset_x"])) / float(wpm["cell_size"]))
    row = round((y - float(wpm["offset_y"])) / float(wpm["cell_size"]))
    col = max(0, min(int(wpm["width"]) - 1, col))
    row = max(0, min(int(wpm["height"]) - 1, row))
    return row, col


def wpm_bfs_distance(wpm: dict[str, object], start: tuple[int, int], goal: tuple[int, int]) -> int | None:
    width = int(wpm["width"])
    height = int(wpm["height"])
    cells = wpm["cells"]
    start_index = start[0] * width + start[1]
    goal_index = goal[0] * width + goal[1]
    if cells[start_index]["ground_blocked"] or cells[goal_index]["ground_blocked"]:
        return None
    queue = [start_index]
    dist = {start_index: 0}
    head = 0
    while head < len(queue):
        index = queue[head]
        head += 1
        if index == goal_index:
            return dist[index]
        row, col = divmod(index, width)
        for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
            if nr < 0 or nr >= height or nc < 0 or nc >= width:
                continue
            nindex = nr * width + nc
            if nindex in dist or cells[nindex]["ground_blocked"]:
                continue
            dist[nindex] = dist[index] + 1
            queue.append(nindex)
    return None


def summarize_wpm(wpm: dict[str, object], start_locations: list[dict[str, object]]) -> dict[str, object]:
    cells = wpm["cells"]
    flag_counts = Counter(cell["flags"] for cell in cells)
    blocked = sum(1 for cell in cells if cell["ground_blocked"])
    build_blocked = sum(1 for cell in cells if cell["build_blocked"])
    goal_locations = [loc for loc in start_locations if str(loc["slot"]) in {"10", "11"}]
    primary_goal = goal_locations[0] if goal_locations else None
    primary_goal_cell = (
        wpm_cell_for_xy(wpm, float(primary_goal["x"]), float(primary_goal["y"])) if primary_goal else None
    )

    starts = []
    for loc in start_locations:
        sx = float(loc["x"])
        sy = float(loc["y"])
        row, col = wpm_cell_for_xy(wpm, sx, sy)
        center_cell = cells[row * int(wpm["width"]) + col]
        nearby = []
        for cell in cells:
            dx = float(cell["x"]) - sx
            dy = float(cell["y"]) - sy
            if dx * dx + dy * dy <= 1024 * 1024:
                nearby.append(cell)
        flags_near = Counter(cell["flags"] for cell in nearby)
        blocked_near = sum(1 for cell in nearby if cell["ground_blocked"])
        build_blocked_near = sum(1 for cell in nearby if cell["build_blocked"])
        distance_to_goal = None
        if primary_goal_cell and str(loc["slot"]) not in {"10", "11"}:
            distance = wpm_bfs_distance(wpm, (row, col), primary_goal_cell)
            distance_to_goal = distance * float(wpm["cell_size"]) if distance is not None else None
        starts.append(
            {
                "slot": loc["slot"],
                "start_x": sx,
                "start_y": sy,
                "row": row,
                "col": col,
                "center_flags": center_cell["flags"],
                "center_hex": center_cell["hex"],
                "center_ground_blocked": center_cell["ground_blocked"],
                "center_build_blocked": center_cell["build_blocked"],
                "cells_in_1024": len(nearby),
                "ground_blocked_1024": blocked_near,
                "ground_blocked_pct_1024": round(blocked_near / len(nearby) * 100.0, 3) if nearby else 0,
                "build_blocked_1024": build_blocked_near,
                "build_blocked_pct_1024": round(build_blocked_near / len(nearby) * 100.0, 3) if nearby else 0,
                "dominant_flags_1024": flags_near.most_common(1)[0][0] if flags_near else "",
                "dominant_flags_count_1024": flags_near.most_common(1)[0][1] if flags_near else 0,
                "distance_to_slot10_path_units": distance_to_goal,
            }
        )

    return {
        "header": {
            "magic": wpm["magic"],
            "version": wpm["version"],
            "width": wpm["width"],
            "height": wpm["height"],
            "offset_x": wpm["offset_x"],
            "offset_y": wpm["offset_y"],
            "cell_size": wpm["cell_size"],
            "remaining_bytes": wpm["remaining_bytes"],
        },
        "interpretation": {
            "ground_blocked_rule": "flags & 0x02 != 0",
            "build_blocked_rule": "flags & 0x08 != 0",
            "note": "Derived from observed start cells and Warcraft III pathing-map convention; verify in gameplay if exact bit semantics matter.",
        },
        "flag_counts": [
            {
                "flags": flags,
                "hex": f"0x{flags:02X}",
                "count": count,
                "ground_blocked": bool(flags & 0x02),
                "build_blocked": bool(flags & 0x08),
            }
            for flags, count in flag_counts.most_common()
        ],
        "totals": {
            "cell_count": len(cells),
            "ground_blocked": blocked,
            "ground_blocked_pct": round(blocked / len(cells) * 100.0, 3),
            "ground_open": len(cells) - blocked,
            "ground_open_pct": round((len(cells) - blocked) / len(cells) * 100.0, 3),
            "build_blocked": build_blocked,
            "build_blocked_pct": round(build_blocked / len(cells) * 100.0, 3),
        },
        "start_pathing": starts,
    }


def classify_doo_rawcode(rawcode: str) -> str:
    if rawcode.endswith("tw") or rawcode in {"BTtw"}:
        return "tree_or_wood_blocker"
    if rawcode.startswith("L"):
        return "lordaeron_terrain_prop"
    if rawcode.startswith("V"):
        return "village_or_structure_prop"
    if rawcode.startswith("D"):
        return "dungeon_or_ruin_prop"
    if rawcode.startswith("Y"):
        return "cityscape_prop"
    if rawcode.startswith("A"):
        return "ashenvale_prop"
    if rawcode.startswith("B"):
        return "barrens_or_destructible_prop"
    return "other"


def summarize_doo(doo: dict[str, object], start_locations: list[dict[str, object]]) -> dict[str, object]:
    doodads = doo["doodads"]
    raw_counts = Counter(d["rawcode"] for d in doodads)
    category_counts = Counter(classify_doo_rawcode(d["rawcode"]) for d in doodads)
    raw_spatial = []
    for raw, count in raw_counts.items():
        group = [d for d in doodads if d["rawcode"] == raw]
        raw_spatial.append(
            {
                "rawcode": raw,
                "count": count,
                "category": classify_doo_rawcode(raw),
                "min_x": min(float(d["x"]) for d in group),
                "max_x": max(float(d["x"]) for d in group),
                "min_y": min(float(d["y"]) for d in group),
                "max_y": max(float(d["y"]) for d in group),
                "avg_x": round(sum(float(d["x"]) for d in group) / count, 3),
                "avg_y": round(sum(float(d["y"]) for d in group) / count, 3),
            }
        )
    xs = [float(d["x"]) for d in doodads]
    ys = [float(d["y"]) for d in doodads]

    starts = []
    for loc in start_locations:
        sx = float(loc["x"])
        sy = float(loc["y"])
        nearby = []
        radii = {512: 0, 1024: 0, 1536: 0, 2048: 0}
        by_category = defaultdict(int)
        by_rawcode = Counter()
        for d in doodads:
            dx = float(d["x"]) - sx
            dy = float(d["y"]) - sy
            dist2 = dx * dx + dy * dy
            for radius in radii:
                if dist2 <= radius * radius:
                    radii[radius] += 1
            if dist2 <= 1536 * 1536:
                category = classify_doo_rawcode(d["rawcode"])
                by_category[category] += 1
                by_rawcode[d["rawcode"]] += 1
                nearby.append(
                    {
                        "rawcode": d["rawcode"],
                        "category": category,
                        "x": d["x"],
                        "y": d["y"],
                        "distance": round(dist2 ** 0.5, 2),
                    }
                )
        nearby.sort(key=lambda item: item["distance"])
        starts.append(
            {
                "slot": loc["slot"],
                "x": sx,
                "y": sy,
                "counts_by_radius": radii,
                "top_rawcodes_1536": [
                    {"rawcode": raw, "count": count} for raw, count in by_rawcode.most_common(8)
                ],
                "category_counts_1536": dict(sorted(by_category.items())),
                "nearest": nearby[:16],
            }
        )

    return {
        "header": {
            "magic": doo["magic"],
            "version": doo["version"],
            "subversion": doo["subversion"],
            "doodad_count": doo["doodad_count"],
            "special_count": doo["special_count"],
            "remaining_bytes": doo["remaining_bytes"],
        },
        "bounds": {
            "min_x": min(xs) if xs else None,
            "max_x": max(xs) if xs else None,
            "min_y": min(ys) if ys else None,
            "max_y": max(ys) if ys else None,
        },
        "top_rawcodes": [
            {"rawcode": raw, "count": count, "category": classify_doo_rawcode(raw)}
            for raw, count in raw_counts.most_common(40)
        ],
        "rawcode_spatial": sorted(raw_spatial, key=lambda row: (-row["count"], row["rawcode"])),
        "category_counts": dict(sorted(category_counts.items())),
        "start_location_neighborhoods": starts,
    }


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_tsv(path: Path, rows: list[dict[str, object]], columns: list[str]) -> None:
    lines = ["\t".join(columns)]
    for row in rows:
        values = [str(row.get(column, "")).replace("\n", "\\n").replace("\t", " ") for column in columns]
        lines.append("\t".join(values))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="docs/chicken_farm/닭농장1.3a.w3x")
    parser.add_argument("--out", default="docs/chicken_farm/chicken_farm_w3x_artifacts")
    args = parser.parse_args()

    source = Path(args.input)
    output = Path(args.out)
    output.mkdir(parents=True, exist_ok=True)

    mpq = MPQ(source.read_bytes())
    extracted: dict[str, bytes] = {}
    manifest = []
    for name in KNOWN_FILES:
        try:
            data = mpq.extract(name)
            if data is None:
                manifest.append({"name": name, "status": "missing"})
                continue
            extracted[name] = data
            manifest.append({"name": name, "status": "ok", "size": len(data)})
        except Exception as exc:
            manifest.append({"name": name, "status": "error", "error": str(exc)})
    for name in FAILED_EXPECTED:
        manifest.append({"name": name, "status": "not_extracted"})
    write_json(output / "extraction_manifest.json", manifest)

    if "war3map.wts" in extracted:
        write_json(output / "wts_strings.json", parse_wts(extracted["war3map.wts"]))

    if r"scripts\war3map.j" in extracted:
        jass_text = extracted[r"scripts\war3map.j"].decode("utf-8", "replace").replace("\r", "\n")
        summary = summarize_jass(extracted[r"scripts\war3map.j"])
        function_labels = label_jass_functions(jass_text)
        wolf_order_analysis = collect_jass_wolf_order_analysis(jass_text)
        day_night_analysis = collect_day_night_wolf_stat_analysis(jass_text)
        write_json(
            output / "jass_metrics.json",
            {
                "function_count": summary["function_count"],
                "line_count": summary["line_count"],
                "call_edge_count": sum(len(row["calls"]) for row in summary["call_graph"]),
                "timer_count": len(summary["timers"]),
                "economy_event_count": len(summary["economy"]),
                "create_unit_event_count": len(summary["create_units"]),
                "rawcode_count": len(summary["rawcodes"]),
            },
        )
        write_tsv(output / "jass_timer_events.tsv", summary["timers"], ["line", "trigger", "seconds"])
        write_tsv(
            output / "jass_economy_events.tsv",
            summary["economy"],
            ["line", "amount_expr", "player_expr", "resource"],
        )
        write_tsv(output / "jass_score_events.tsv", summary["scores"], ["line", "points", "message"])
        write_tsv(
            output / "jass_create_units.tsv",
            summary["create_units"],
            ["line", "count", "unit_expr", "owner_expr"],
        )
        write_tsv(output / "jass_rawcodes.tsv", summary["rawcodes"], ["rawcode", "decimal"])
        write_tsv(output / "map_start_locations.tsv", summary["start_locations"], ["line", "slot", "x", "y"])
        write_tsv(
            output / "jass_call_graph.tsv",
            [
                {"function": row["function"], "callee": callee}
                for row in summary["call_graph"]
                for callee in row["calls"]
            ],
            ["function", "callee"],
        )
        write_tsv(
            output / "jass_function_labels.tsv",
            function_labels["rows"],
            [
                "function",
                "line_start",
                "line_end",
                "labels",
                "direct_labels",
                "inherited_labels",
                "call_count",
                "calls",
                "reasons",
            ],
        )
        write_tsv(
            output / "jass_label_summary.tsv",
            function_labels["summary"],
            ["label", "function_count", "direct_count", "inherited_count", "first_functions"],
        )
        write_tsv(
            output / "jass_labeled_call_edges.tsv",
            function_labels["edges"],
            ["caller", "callee", "caller_labels", "callee_labels"],
        )
        write_tsv(
            output / "jass_wolf_order_flows.tsv",
            wolf_order_analysis["order_flows"],
            [
                "function",
                "line_start",
                "line_end",
                "flow_type",
                "trigger_source",
                "unit_scope",
                "unit_filter",
                "order_api",
                "order_string",
                "target_expr",
                "target_area",
                "min_x",
                "min_y",
                "max_x",
                "max_y",
                "radius",
                "target_priority_inferred",
                "mvp_translation",
                "confidence",
            ],
        )
        write_tsv(
            output / "jass_wolf_spawn_points.tsv",
            wolf_order_analysis["spawn_points"],
            [
                "spawn_index",
                "rect_symbol",
                "line",
                "min_x",
                "min_y",
                "max_x",
                "max_y",
                "center_x",
                "center_y",
                "role_inferred",
            ],
        )
        write_tsv(
            output / "jass_wolf_unit_tiers.tsv",
            wolf_order_analysis["wolf_tiers"],
            ["tier_index", "rawcode", "decimal", "line"],
        )
        write_tsv(
            output / "jass_wolf_special_spawns.tsv",
            wolf_order_analysis["special_spawns"],
            ["line", "count", "rawcode", "decimal", "owner", "rect_symbol", "center_x", "center_y", "role_inferred"],
        )
        write_tsv(
            output / "jass_wolf_order_areas.tsv",
            wolf_order_analysis["areas"],
            ["symbol", "role_inferred", "rect_symbol", "line", "min_x", "min_y", "max_x", "max_y"],
        )
        write_tsv(
            output / "jass_day_night_events.tsv",
            day_night_analysis["registrations"],
            [
                "line",
                "trigger",
                "comparator",
                "time_of_day",
                "action_function",
                "action_line_start",
                "action_line_end",
                "action_calls",
                "stat_affecting_calls",
                "wolf_rawcode_refs",
                "inferred_effect",
            ],
        )
        write_tsv(
            output / "jass_night_wolf_stat_candidates.tsv",
            day_night_analysis["stat_candidates"],
            [
                "function",
                "line_start",
                "line_end",
                "stat_affecting_calls",
                "calls",
                "player10_ref",
                "wolf_rawcode_refs",
                "registered_time_of_day_action",
                "night_wolf_stat_link_confidence",
            ],
        )
    else:
        summary = {"start_locations": []}

    unit_crosscheck = build_unit_crosscheck(mpq, summary)
    write_json(
        output / "unit_crosscheck_summary.json",
        {
            "ini_section_count": unit_crosscheck["ini_section_count"],
            "slk_table_counts": unit_crosscheck["slk_table_counts"],
            "anonymous_blocks": unit_crosscheck["anonymous_blocks"],
            "note": "Derived from unnamed, unencrypted MPQ blocks that contain unit INI/SLK tables; raw original files are not written.",
        },
    )
    write_tsv(
        output / "unit_rawcode_crosscheck.tsv",
        unit_crosscheck["rows"],
        [
            "rawcode",
            "name",
            "role_inferred",
            "created_total_from_jass",
            "create_lines",
            "income_lumber_30s",
            "upgrade_to",
            "requires",
            "builds",
            "trains",
            "abil_list",
            "hero_abil_list",
            "art",
            "model",
            "level",
            "goldcost",
            "lumbercost",
            "fmade",
            "fused",
            "HP",
            "manaN",
            "def",
            "defType",
            "spd",
            "race",
            "prio",
            "threat",
            "movetp",
            "moveHeight",
            "turnRate",
            "propWin",
            "sight",
            "nsight",
            "weapsOn",
            "acquire",
            "rangeN1",
            "cool1",
            "dmgplus1",
            "dice1",
            "sides1",
            "atkType1",
            "weapType1",
            "targs1",
            "stat_source",
        ],
    )

    object_summary = {}
    object_index_rows = []
    object_string_rows = []
    interesting_text = re.compile(r"[가-힣]|Chicken|Wolf|Tower|Farm|Egg|tower|farm|egg|wolf|chicken")
    for name in ("war3map.w3a", "war3map.w3q", "war3map.w3h", "war3map.w3b", "war3map.w3d"):
        if name not in extracted:
            continue
        try:
            parsed = parse_object_mods(extracted[name])
            for table in parsed["tables"]:
                for obj in table["objects"]:
                    object_index_rows.append(
                        {
                            "file": name,
                            "table": table["name"],
                            "old_id": obj["old_id"],
                            "new_id": obj["new_id"],
                            "mod_count": obj["mod_count"],
                        }
                    )
                    for mod in obj["mods"]:
                        value = str(mod["value"])
                        if interesting_text.search(value):
                            object_string_rows.append(
                                {
                                    "file": name,
                                    "table": table["name"],
                                    "old_id": obj["old_id"],
                                    "new_id": obj["new_id"],
                                    "field": mod["field"],
                                    "level_or_variation": mod["level_or_variation"],
                                    "value": value,
                                }
                            )
            object_summary[name] = {
                "version": parsed["version"],
                "remaining_bytes": parsed["remaining_bytes"],
                "tables": [
                    {
                        "name": table["name"],
                        "object_count": table["object_count"],
                        "sample_objects": table["objects"][:12],
                    }
                    for table in parsed["tables"]
                ],
            }
        except Exception as exc:
            object_summary[name] = {"error": str(exc), "size": len(extracted[name])}
    write_json(output / "object_mod_summary.json", object_summary)
    write_tsv(
        output / "object_mod_index.tsv",
        object_index_rows,
        ["file", "table", "old_id", "new_id", "mod_count"],
    )
    write_tsv(
        output / "object_mod_key_strings.tsv",
        object_string_rows,
        ["file", "table", "old_id", "new_id", "field", "level_or_variation", "value"],
    )

    if "war3map.doo" in extracted:
        doo = parse_doo(extracted["war3map.doo"])
        doo_summary = summarize_doo(doo, summary["start_locations"])
        write_json(output / "doo_summary.json", doo_summary)
        write_tsv(
            output / "doo_doodads.tsv",
            doo["doodads"],
            [
                "index",
                "rawcode",
                "variation",
                "x",
                "y",
                "z",
                "angle_rad",
                "scale_x",
                "scale_y",
                "scale_z",
                "flags",
                "life",
                "item_table_pointer",
                "item_set_count",
                "editor_id",
            ],
        )
        write_tsv(
            output / "doo_rawcode_counts.tsv",
            doo_summary["top_rawcodes"],
            ["rawcode", "count", "category"],
        )
        write_tsv(
            output / "doo_rawcode_spatial.tsv",
            doo_summary["rawcode_spatial"],
            ["rawcode", "count", "category", "min_x", "max_x", "min_y", "max_y", "avg_x", "avg_y"],
        )
        start_summary_rows = []
        for start in doo_summary["start_location_neighborhoods"]:
            cats = start["category_counts_1536"]
            start_summary_rows.append(
                {
                    "slot": start["slot"],
                    "start_x": start["x"],
                    "start_y": start["y"],
                    "count_512": start["counts_by_radius"][512],
                    "count_1024": start["counts_by_radius"][1024],
                    "count_1536": start["counts_by_radius"][1536],
                    "count_2048": start["counts_by_radius"][2048],
                    "tree_or_wood_blocker_1536": cats.get("tree_or_wood_blocker", 0),
                    "structure_prop_1536": cats.get("village_or_structure_prop", 0),
                    "terrain_prop_1536": cats.get("lordaeron_terrain_prop", 0),
                    "cityscape_prop_1536": cats.get("cityscape_prop", 0),
                    "other_1536": cats.get("other", 0),
                }
            )
        write_tsv(
            output / "doo_start_neighborhoods.tsv",
            start_summary_rows,
            [
                "slot",
                "start_x",
                "start_y",
                "count_512",
                "count_1024",
                "count_1536",
                "count_2048",
                "tree_or_wood_blocker_1536",
                "structure_prop_1536",
                "terrain_prop_1536",
                "cityscape_prop_1536",
                "other_1536",
            ],
        )
        neighborhood_rows = []
        for start in doo_summary["start_location_neighborhoods"]:
            for raw in start["top_rawcodes_1536"]:
                neighborhood_rows.append(
                    {
                        "slot": start["slot"],
                        "start_x": start["x"],
                        "start_y": start["y"],
                        "rawcode": raw["rawcode"],
                        "count_1536": raw["count"],
                    }
                )
        write_tsv(
            output / "doo_start_neighborhood_rawcodes.tsv",
            neighborhood_rows,
            ["slot", "start_x", "start_y", "rawcode", "count_1536"],
        )

    if "war3map.w3e" in extracted:
        w3e = parse_w3e(extracted["war3map.w3e"])
        w3e_summary = summarize_w3e(w3e, summary["start_locations"])
        write_json(output / "w3e_summary.json", w3e_summary)
        write_tsv(
            output / "w3e_tiles.tsv",
            w3e["tiles"],
            [
                "row",
                "col",
                "x",
                "y",
                "ground_height",
                "water_level",
                "flags",
                "texture",
                "ground_index",
                "ground_tile",
                "texture_variant",
                "cliff",
                "cliff_index",
                "cliff_tile",
                "layer_height",
            ],
        )
        write_tsv(
            output / "w3e_ground_counts.tsv",
            w3e_summary["ground_counts"],
            ["ground_tile", "count"],
        )
        write_tsv(
            output / "w3e_start_terrain.tsv",
            w3e_summary["start_terrain"],
            [
                "slot",
                "start_x",
                "start_y",
                "nearest_row",
                "nearest_col",
                "nearest_ground_tile",
                "nearest_texture",
                "nearest_flags",
                "nearest_height",
                "tiles_in_1024",
                "avg_height_1024",
                "min_height_1024",
                "max_height_1024",
                "dominant_ground_1024",
                "dominant_ground_count_1024",
                "dominant_flags_1024",
                "dominant_flags_count_1024",
            ],
        )

    if "war3map.wpm" in extracted:
        offset_x = -3072.0
        offset_y = -7680.0
        if "war3map.w3e" in extracted:
            w3e_for_offsets = parse_w3e(extracted["war3map.w3e"])
            offset_x = float(w3e_for_offsets["offset_x"])
            offset_y = float(w3e_for_offsets["offset_y"])
        wpm = parse_wpm(extracted["war3map.wpm"], offset_x, offset_y)
        wpm_summary = summarize_wpm(wpm, summary["start_locations"])
        write_json(output / "wpm_summary.json", wpm_summary)
        write_tsv(
            output / "wpm_cells.tsv",
            wpm["cells"],
            [
                "row",
                "col",
                "x",
                "y",
                "flags",
                "hex",
                "ground_blocked",
                "build_blocked",
                "bit_0x40",
                "bit_0x80",
            ],
        )
        write_tsv(
            output / "wpm_flag_counts.tsv",
            wpm_summary["flag_counts"],
            ["flags", "hex", "count", "ground_blocked", "build_blocked"],
        )
        write_tsv(
            output / "wpm_start_pathing.tsv",
            wpm_summary["start_pathing"],
            [
                "slot",
                "start_x",
                "start_y",
                "row",
                "col",
                "center_flags",
                "center_hex",
                "center_ground_blocked",
                "center_build_blocked",
                "cells_in_1024",
                "ground_blocked_1024",
                "ground_blocked_pct_1024",
                "build_blocked_1024",
                "build_blocked_pct_1024",
                "dominant_flags_1024",
                "dominant_flags_count_1024",
                "distance_to_slot10_path_units",
            ],
        )

    reference_dir = output / "reference_assets"
    reference_dir.mkdir(exist_ok=True)
    asset_manifest = []
    for asset_name in REFERENCE_ASSETS:
        data = extracted.get(asset_name)
        if data is None:
            try:
                data = mpq.extract(asset_name)
            except Exception as exc:
                asset_manifest.append({"name": asset_name, "status": "error", "error": str(exc)})
                continue
        if data is None:
            asset_manifest.append({"name": asset_name, "status": "missing"})
            continue
        output_name = asset_name.replace("\\", "__").replace("/", "__")
        (reference_dir / output_name).write_bytes(data)
        asset_manifest.append(
            {
                "name": asset_name,
                "status": "ok",
                "size": len(data),
                "output": f"reference_assets/{output_name}",
                "note": "reference only; do not ship or reuse directly",
            }
        )
    write_json(output / "reference_asset_manifest.json", asset_manifest)


if __name__ == "__main__":
    main()
