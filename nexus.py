#!/usr/bin/env python3
"""
NEXUS AI v2.0
Professional Sales Intelligence Platform
Multi-Business SaaS Edition - with Lead Scoring
Fixed for Python 3.9 / Termux / Mobile
"""

import os
import sys
import json
import uuid
import time
import re
import datetime
import threading
import requests
from typing import Optional, Dict, List
from flask import Flask, request, jsonify

# -- Optional imports with graceful degradation --------------------------------
try:
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    SHEETS_AVAILABLE = True
except ImportError:
    SHEETS_AVAILABLE = False

try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

try:
    from PIL import Image
    import pytesseract
    import io
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# ------------------------------------------------------------------------------
#  CONSTANTS
# ------------------------------------------------------------------------------
MASTER_KEY             = 0x1717ed1e400b
CONFIGS_FILE           = "configs.json"
CREDS_FILE             = "credentials.json"
APP_VERSION            = "v2.0"
REENGAGEMENT_HOURS     = 24
SKIP_STAGES            = {"HANDOVER", "AUDIT"}
REENGAGEMENT_MIN_SCORE = 30

FUNNEL_STAGES = [
    "AWARENESS", "INTENT", "BUDGET",
    "QUALIFICATION", "NEGOTIATION", "HANDOVER", "AUDIT"
]

TAB_LEADS     = "Leads"
TAB_INVENTORY = "Inventory"
TAB_AUDIT     = "Audit_Log"
TAB_BROADCAST = "Broadcast"

INVENTORY_KEYWORDS = [
    "car", "vehicle", "suv", "sedan", "truck",
    "land", "property", "house", "duplex", "apartment",
    "unit", "service", "package", "product", "item",
    "space", "slot", "seat", "plan", "deal"
]

DISCOUNT_TRIGGERS = [
    "too expensive", "discount", "reduce", "lower price",
    "cheaper", "too much", "cut the price", "negotiate"
]

LEADS_HEADERS = [
    "Phone", "Name", "Stage", "Score", "Score Label",
    "Intent", "Budget", "Quoted Price", "Final Price",
    "Discount Used", "Handover Triggered", "Last Updated"
]
INVENTORY_HEADERS = ["Item", "Description", "Price", "Min_Price", "Available"]
AUDIT_HEADERS     = ["Timestamp", "Phone", "Event", "Detail"]
BROADCAST_HEADERS = ["Phone", "Name", "Status"]

STAGE_SCORE_MAP = {
    "AWARENESS":     0,
    "INTENT":        5,
    "BUDGET":       10,
    "QUALIFICATION":15,
    "NEGOTIATION":  20,
    "HANDOVER":     25,
    "AUDIT":        30
}

app = Flask(__name__)

# ------------------------------------------------------------------------------
#  VISUALS
# ------------------------------------------------------------------------------
def welcome_banner():
    os.system("clear")
    print("""
\033[36m
  NEXUS AI v2.0
  =========================================
  Professional Sales Intelligence Platform
  Multi-Business SaaS Edition
\033[0m""")
    print("\033[90m  " + "-" * 50 + "\033[0m\n")

# ------------------------------------------------------------------------------
#  SECURITY - HARDWARE LOCK
# ------------------------------------------------------------------------------
def hardware_lock():
    device_id = uuid.getnode()
    if device_id != MASTER_KEY:
        print("\n\033[31m  X  UNAUTHORIZED DEVICE\033[0m")
        print("\033[90m  Device ID: {}\033[0m\n".format(hex(device_id)))
        sys.exit(1)

# ------------------------------------------------------------------------------
#  MULTI-BUSINESS CONFIG
# ------------------------------------------------------------------------------
def load_all_configs():
    if os.path.exists(CONFIGS_FILE):
        with open(CONFIGS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_all_configs(configs):
    with open(CONFIGS_FILE, "w") as f:
        json.dump(configs, f, indent=2)

def get_config(business_id):
    return load_all_configs().get(business_id, {})

def register_business_config(business_id, config):
    configs = load_all_configs()
    configs[business_id] = config
    save_all_configs(configs)

def first_time_setup():
    print("\033[33m  No businesses registered. Setting up your first client:\033[0m\n")

    business_id   = input("  Business ID (e.g. kayus_autos)    : ").strip().lower().replace(" ", "_")
    business_name = input("  Business Name                      : ").strip()
    sheet_id      = input("  Google Sheet ID                    : ").strip()
    manager_wa    = input("  Manager WhatsApp (+234...)         : ").strip()
    twilio_sid    = input("  Twilio Account SID                 : ").strip()
    twilio_token  = input("  Twilio Auth Token                  : ").strip()
    twilio_from   = input("  Twilio WhatsApp Number             : ").strip()
    report_time   = input("  Daily Report Time (HH:MM, 24hr)   : ").strip() or "08:00"

    if not all([business_id, business_name, sheet_id, manager_wa]):
        print("\n\033[31m  X  ID, Name, Sheet ID, and Manager WhatsApp are required.\033[0m\n")
        sys.exit(1)

    config = {
        "business_name":    business_name,
        "google_sheet_id":  sheet_id,
        "manager_whatsapp": manager_wa,
        "twilio_sid":       twilio_sid,
        "twilio_token":     twilio_token,
        "twilio_from":      twilio_from,
        "verify_token":     "nexus_{}_token".format(business_id),
        "report_time":      report_time
    }

    register_business_config(business_id, config)
    print("\n\033[32m  OK  Business '{}' registered.\033[0m".format(business_id))
    print("\033[90m  Webhook URL  : /webhook/{}\033[0m".format(business_id))
    print("\033[90m  Verify Token : {}\033[0m\n".format(config["verify_token"]))
    return business_id

# ------------------------------------------------------------------------------
#  TWILIO CLIENTS - cached per business
# ------------------------------------------------------------------------------
_twilio_clients = {}

def get_twilio_client(business_id):
    if business_id in _twilio_clients:
        return _twilio_clients[business_id]
    if not TWILIO_AVAILABLE:
        return None
    config = get_config(business_id)
    sid    = config.get("twilio_sid", "").strip()
    token  = config.get("twilio_token", "").strip()
    if not sid or not token:
        return None
    client = TwilioClient(sid, token)
    _twilio_clients[business_id] = client
    return client

# ------------------------------------------------------------------------------
#  GOOGLE SHEETS CLIENTS - cached per business
# ------------------------------------------------------------------------------
_gspread_clients = {}
_sheets_cache    = {}

def get_sheet(business_id):
    if business_id in _sheets_cache:
        return _sheets_cache[business_id]
    if not SHEETS_AVAILABLE or not os.path.exists(CREDS_FILE):
        return None
    try:
        if business_id not in _gspread_clients:
            scope = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive"
            ]
            creds = ServiceAccountCredentials.from_json_keyfile_name(CREDS_FILE, scope)
            _gspread_clients[business_id] = gspread.authorize(creds)
        config = get_config(business_id)
        sheet  = _gspread_clients[business_id].open_by_key(config["google_sheet_id"])
        _sheets_cache[business_id] = sheet
        return sheet
    except Exception as e:
        print("\033[31m  [SHEETS:{}] Auth failed: {}\033[0m".format(business_id, e))
        return None

def get_or_create_tab(sheet, tab_name, headers):
    try:
        return sheet.worksheet(tab_name)
    except Exception:
        ws = sheet.add_worksheet(title=tab_name, rows="1000", cols="20")
        ws.append_row(headers)
        return ws

# ------------------------------------------------------------------------------
#  SHEETS - LEADS SYNC
# ------------------------------------------------------------------------------
def sync_to_sheets(phone, business_id):
    sheet = get_sheet(business_id)
    if not sheet:
        return
    try:
        customer    = get_customer(phone, business_id)
        score       = customer.get("score", 0)
        score_label = get_score_label(score)
        ws          = get_or_create_tab(sheet, TAB_LEADS, LEADS_HEADERS)
        row_data    = [
            customer.get("phone", ""),
            customer.get("name") or "",
            customer.get("stage", ""),
            score,
            score_label,
            customer.get("intent") or "",
            customer.get("budget") or "",
            str(customer.get("quoted_price") or ""),
            str(customer.get("final_price") or ""),
            "Yes" if customer.get("discount_used") else "No",
            "Yes" if customer.get("handover_triggered") else "No",
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ]
        all_phones = ws.col_values(1)
        if phone in all_phones:
            idx = all_phones.index(phone) + 1
            ws.update("A{}:L{}".format(idx, idx), [row_data])
        else:
            ws.append_row(row_data)
    except Exception as e:
        print("\033[31m  [SHEETS:{}] sync_to_sheets: {}\033[0m".format(business_id, e))

# ------------------------------------------------------------------------------
#  SHEETS - INVENTORY LOOKUP
# ------------------------------------------------------------------------------
def lookup_inventory(keyword, business_id):
    sheet = get_sheet(business_id)
    if not sheet:
        return None
    try:
        ws      = get_or_create_tab(sheet, TAB_INVENTORY, INVENTORY_HEADERS)
        records = ws.get_all_records()
        kw      = keyword.lower()
        for row in records:
            item_col = str(row.get("Item", "")).lower()
            desc_col = str(row.get("Description", "")).lower()
            if kw in item_col or kw in desc_col:
                return {
                    "item":      row.get("Item", ""),
                    "price":     float(str(row.get("Price", 0)).replace(",", "") or 0),
                    "min_price": float(str(row.get("Min_Price", 0)).replace(",", "") or 0),
                    "available": str(row.get("Available", "Unknown"))
                }
    except Exception as e:
        print("\033[31m  [SHEETS:{}] lookup_inventory: {}\033[0m".format(business_id, e))
    return None

# ------------------------------------------------------------------------------
#  SHEETS - AUDIT LOG
# ------------------------------------------------------------------------------
def log_to_audit(phone, business_id, event, detail=""):
    sheet = get_sheet(business_id)
    if not sheet:
        return
    try:
        ws = get_or_create_tab(sheet, TAB_AUDIT, AUDIT_HEADERS)
        ws.append_row([
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            phone, event, detail[:500]
        ])
    except Exception as e:
        print("\033[31m  [SHEETS:{}] log_to_audit: {}\033[0m".format(business_id, e))

# ------------------------------------------------------------------------------
#  SHEETS - BROADCAST LIST
# ------------------------------------------------------------------------------
def get_broadcast_list(business_id):
    sheet = get_sheet(business_id)
    if not sheet:
        return []
    try:
        ws      = get_or_create_tab(sheet, TAB_BROADCAST, BROADCAST_HEADERS)
        records = ws.get_all_records()
        result  = []
        for i, row in enumerate(records):
            phone = str(row.get("Phone", "")).strip()
            if phone:
                result.append({
                    "phone":     phone,
                    "name":      str(row.get("Name", "")).strip(),
                    "row_index": i + 2
                })
        return result
    except Exception as e:
        print("\033[31m  [SHEETS:{}] get_broadcast_list: {}\033[0m".format(business_id, e))
        return []

def update_broadcast_status(business_id, row_index, status):
    sheet = get_sheet(business_id)
    if not sheet:
        return
    try:
        ws = sheet.worksheet(TAB_BROADCAST)
        ws.update_cell(row_index, 3, status)
    except Exception as e:
        print("\033[31m  [SHEETS:{}] update_broadcast_status: {}\033[0m".format(business_id, e))

# ------------------------------------------------------------------------------
#  OCR MODULE
# ------------------------------------------------------------------------------
def process_invoice(phone, image_url, business_id):
    if not OCR_AVAILABLE:
        return "OCR module not available. Install pytesseract and Pillow."
    try:
        response  = requests.get(image_url, timeout=15)
        response.raise_for_status()
        image     = Image.open(io.BytesIO(response.content))
        extracted = pytesseract.image_to_string(image).strip()
        if not extracted:
            extracted = "[OCR returned no text - image may be unclear]"
        log_to_audit(phone, business_id, "OCR_INVOICE", extracted)
        return extracted
    except Exception as e:
        err = "OCR error: {}".format(e)
        log_to_audit(phone, business_id, "OCR_ERROR", err)
        return err

# ------------------------------------------------------------------------------
#  VOICE NOTE TRANSCRIPTION - PLACEHOLDER
# ------------------------------------------------------------------------------
def transcribe_audio(media_url, business_id):
    """
    PLUG IN YOUR API HERE:

    OPTION A - OpenAI Whisper:
        import openai
        audio_bytes = requests.get(media_url).content
        transcript  = openai.Audio.transcribe("whisper-1", io.BytesIO(audio_bytes))
        return transcript["text"]

    OPTION B - AssemblyAI:
        headers  = {"authorization": ASSEMBLYAI_KEY, "content-type": "application/json"}
        response = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            json={"audio_url": media_url}, headers=headers
        )
        # Poll until status == "completed", return response.json()["text"]

    OPTION C - Google Speech-to-Text:
        Use google-cloud-speech SDK with audio bytes.
    """
    log_to_audit("SYSTEM", business_id, "AUDIO_RECEIVED", "URL: {}".format(media_url))
    return (
        "[Voice note received - transcription not yet configured. "
        "Please reply with text to continue.]"
    )

# ------------------------------------------------------------------------------
#  WHATSAPP DELIVERY
# ------------------------------------------------------------------------------
def send_whatsapp(to, message, business_id):
    client = get_twilio_client(business_id)
    if not client:
        print("\033[33m  [WA:{}] FALLBACK -> {}: {}\033[0m".format(
            business_id, to, message[:60]))
        return False
    config  = get_config(business_id)
    from_wa = "whatsapp:{}".format(config.get("twilio_from", ""))
    to_wa   = "whatsapp:{}".format(to)
    try:
        msg = client.messages.create(from_=from_wa, to=to_wa, body=message)
        print("\033[32m  [WA:{}] Sent {} -> {}\033[0m".format(business_id, msg.sid, to))
        return True
    except Exception as e:
        print("\033[31m  [WA:{}] Failed -> {}: {}\033[0m".format(business_id, to, e))
        return False

def alert_manager(message, business_id):
    config  = get_config(business_id)
    manager = config.get("manager_whatsapp", "")
    if not manager:
        return False
    return send_whatsapp(manager, message, business_id)

# ------------------------------------------------------------------------------
#  LEAD SCORING ENGINE
#
#  SCORING RULES (max 100 points):
#
#  STAGES COMPLETED  - 30 pts max
#    AWARENESS=0, INTENT=5, BUDGET=10, QUALIFICATION=15,
#    NEGOTIATION=20, HANDOVER=25, AUDIT=30
#
#  BUDGET SIZE       - 30 pts max
#    >= 10,000,000 -> 30 pts
#    >= 5,000,000  -> 25 pts
#    >= 1,000,000  -> 20 pts
#    >= 500,000    -> 15 pts
#    >= 100,000    -> 10 pts
#    >= 50,000     ->  5 pts
#    > 0           ->  2 pts
#
#  RESPONSE SPEED    - 20 pts max
#    < 10 mins  -> 20 pts
#    < 30 mins  -> 15 pts
#    < 2 hours  -> 10 pts
#    < 12 hours ->  5 pts
#    >= 12 hrs  ->  0 pts
#
#  NEGOTIATION       - 10 pts (argued price = genuine interest)
#  INTENT QUALITY    - 10 pts (> 20 chars = specific buyer)
#
#  SCORE LABELS:
#    80-100 -> HOT
#    60-79  -> WARM
#    40-59  -> COOL
#    20-39  -> COLD
#     0-19  -> DEAD
# ------------------------------------------------------------------------------

def extract_budget_number(budget_str):
    if not budget_str:
        return 0.0
    clean = budget_str.lower().replace(",", "").replace("\u20a6", "").replace("$", "")
    clean = re.sub(r'(\d+\.?\d*)\s*k', lambda m: str(float(m.group(1)) * 1000), clean)
    clean = re.sub(r'(\d+\.?\d*)\s*(m|million)', lambda m: str(float(m.group(1)) * 1000000), clean)
    numbers = re.findall(r'\d+\.?\d*', clean)
    return float(numbers[0]) if numbers else 0.0

def calculate_score(customer):
    score = 0

    # 1. Stages completed (max 30)
    stage = customer.get("stage", "AWARENESS")
    score += STAGE_SCORE_MAP.get(stage, 0)

    # 2. Budget size (max 30)
    budget_val = extract_budget_number(str(customer.get("budget") or ""))
    if budget_val >= 10000000:
        score += 30
    elif budget_val >= 5000000:
        score += 25
    elif budget_val >= 1000000:
        score += 20
    elif budget_val >= 500000:
        score += 15
    elif budget_val >= 100000:
        score += 10
    elif budget_val >= 50000:
        score += 5
    elif budget_val > 0:
        score += 2

    # 3. Response speed (max 20)
    try:
        created = datetime.datetime.fromisoformat(customer.get("created_at", ""))
        updated = datetime.datetime.fromisoformat(customer.get("last_updated", ""))
        minutes = (updated - created).total_seconds() / 60
        if minutes < 10:
            score += 20
        elif minutes < 30:
            score += 15
        elif minutes < 120:
            score += 10
        elif minutes < 720:
            score += 5
    except (ValueError, TypeError):
        pass

    # 4. Negotiation attempt (10)
    if customer.get("discount_used"):
        score += 10

    # 5. Intent quality (10)
    intent = customer.get("intent") or ""
    if len(intent.strip()) > 20:
        score += 10

    return min(score, 100)

def get_score_label(score):
    if score >= 80:
        return "HOT"
    elif score >= 60:
        return "WARM"
    elif score >= 40:
        return "COOL"
    elif score >= 20:
        return "COLD"
    return "DEAD"

def refresh_score(phone, business_id):
    memory   = load_memory(business_id)
    customer = memory.get(phone)
    if not customer:
        return 0
    new_score         = calculate_score(customer)
    customer["score"] = new_score
    memory[phone]     = customer
    save_memory(memory, business_id)
    return new_score

# ------------------------------------------------------------------------------
#  MEMORY ENGINE - per business
# ------------------------------------------------------------------------------
def memory_file(business_id):
    return "memory_{}.json".format(business_id)

def load_memory(business_id):
    path = memory_file(business_id)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}

def save_memory(memory, business_id):
    with open(memory_file(business_id), "w") as f:
        json.dump(memory, f, indent=2)

def get_customer(phone, business_id):
    memory = load_memory(business_id)
    if phone not in memory:
        now = datetime.datetime.now().isoformat()
        memory[phone] = {
            "phone":              phone,
            "business_id":        business_id,
            "stage":              "AWARENESS",
            "score":              0,
            "intent":             None,
            "budget":             None,
            "quoted_price":       None,
            "final_price":        None,
            "discount_used":      False,
            "name":               None,
            "active_inventory":   None,
            "notes":              [],
            "handover_triggered": False,
            "reengagement_sent":  False,
            "last_updated":       now,
            "created_at":         now
        }
        save_memory(memory, business_id)
    return memory[phone]

def update_customer(phone, updates, business_id):
    memory = load_memory(business_id)
    if phone not in memory:
        get_customer(phone, business_id)
        memory = load_memory(business_id)

    if "stage" in updates and updates["stage"] not in FUNNEL_STAGES:
        raise ValueError("Invalid stage: '{}'".format(updates["stage"]))

    updates["last_updated"] = datetime.datetime.now().isoformat()
    memory[phone].update(updates)
    save_memory(memory, business_id)

    refresh_score(phone, business_id)
    sync_to_sheets(phone, business_id)
    return load_memory(business_id)[phone]

def advance_stage(phone, business_id):
    customer = get_customer(phone, business_id)
    idx      = FUNNEL_STAGES.index(customer["stage"])
    if idx < len(FUNNEL_STAGES) - 1:
        next_stage = FUNNEL_STAGES[idx + 1]
        update_customer(phone, {"stage": next_stage}, business_id)
        return next_stage
    return customer["stage"]

def add_note(phone, note, business_id):
    memory   = load_memory(business_id)
    customer = memory.get(phone) or get_customer(phone, business_id)
    customer["notes"].append({
        "timestamp": datetime.datetime.now().isoformat(),
        "note":      note
    })
    memory[phone] = customer
    save_memory(memory, business_id)

# ------------------------------------------------------------------------------
#  NEGOTIATION ENGINE
# ------------------------------------------------------------------------------
def negotiate_price(phone, business_id, current_price, min_price, customer_message):
    msg_lower = customer_message.lower().strip()
    triggered = any(t in msg_lower for t in DISCOUNT_TRIGGERS)

    if not triggered:
        return {
            "triggered": False,
            "new_price": current_price,
            "blocked":   False,
            "message":   None
        }

    customer = get_customer(phone, business_id)

    if customer["discount_used"]:
        return {
            "triggered": True,
            "new_price": current_price,
            "blocked":   True,
            "message": (
                "I understand your concern, but this is our best and final price. "
                "Every available consideration has already been applied to this offer."
            )
        }

    if current_price <= min_price:
        return {
            "triggered": True,
            "new_price": min_price,
            "blocked":   True,
            "message": (
                "This offer is already at our minimum - NGN {:,.0f}. "
                "We cannot go lower without compromising quality of delivery.".format(min_price)
            )
        }

    discounted = round(current_price * 0.95, 2)
    if discounted < min_price:
        discounted = min_price

    update_customer(phone, {
        "discount_used": True,
        "quoted_price":  current_price,
        "final_price":   discounted
    }, business_id)

    return {
        "triggered": True,
        "new_price": discounted,
        "blocked":   False,
        "message": (
            "I've applied a special consideration for you. "
            "Final price: NGN {:,.0f}. "
            "This is a one-time adjustment - I'm holding this for you now.".format(discounted)
        )
    }

# ------------------------------------------------------------------------------
#  HANDOVER ENGINE
# ------------------------------------------------------------------------------
def trigger_handover(phone, business_id):
    customer      = get_customer(phone, business_id)
    biz_name      = get_config(business_id).get("business_name", business_id)
    score         = customer.get("score", 0)
    score_label   = get_score_label(score)
    discount_line = "Yes - discount was applied." if customer["discount_used"] else "No discount applied."
    notes_list    = customer.get("notes", [])
    notes_text    = "\n".join(
        ["  - [{}] {}".format(n["timestamp"][:16], n["note"]) for n in notes_list]
    ) if notes_list else "  None"

    whatsapp_message = (
        "*NEXUS AI - HOT LEAD ALERT*\n\n"
        "Business  : {}\n"
        "Phone     : {}\n"
        "Name      : {}\n"
        "Intent    : {}\n"
        "Budget    : {}\n"
        "Quoted    : {}\n"
        "Final     : {}\n"
        "Discount  : {}\n"
        "Score     : {}/100 - {}\n\n"
        "*Notes:*\n{}\n\n"
        "This lead is ready for your close. Move now."
    ).format(
        biz_name,
        customer["phone"],
        customer.get("name") or "Not provided",
        customer.get("intent") or "Not captured",
        customer.get("budget") or "Not captured",
        customer.get("quoted_price") or "Not quoted",
        customer.get("final_price") or "Not finalized",
        discount_line,
        score,
        score_label,
        notes_text
    )

    update_customer(phone, {"stage": "HANDOVER", "handover_triggered": True}, business_id)
    log_to_audit(
        phone, business_id, "HANDOVER_TRIGGERED",
        "Intent: {} | Budget: {} | Score: {}".format(
            customer.get("intent"), customer.get("budget"), score
        )
    )

    return {"summary": customer, "whatsapp_message": whatsapp_message}

# ------------------------------------------------------------------------------
#  INVENTORY KEYWORD EXTRACTOR
# ------------------------------------------------------------------------------
def extract_inventory_keyword(message):
    msg_lower = message.lower()
    for kw in INVENTORY_KEYWORDS:
        if kw in msg_lower:
            return kw
    return None

# ------------------------------------------------------------------------------
#  FUNNEL ROUTER
# ------------------------------------------------------------------------------
def route_message(phone, message, business_id):
    # Customer is active - reset re-engagement flag
    mem = load_memory(business_id)
    if phone in mem and mem[phone].get("reengagement_sent"):
        mem[phone]["reengagement_sent"] = False
        save_memory(mem, business_id)

    customer = get_customer(phone, business_id)
    stage    = customer["stage"]
    msg      = message.strip()

    # Global: inventory hook
    inv_keyword = extract_inventory_keyword(msg)
    if inv_keyword and stage in ("INTENT", "BUDGET", "QUALIFICATION", "NEGOTIATION"):
        item = lookup_inventory(inv_keyword, business_id)
        if item:
            update_customer(phone, {
                "quoted_price":     item["price"],
                "active_inventory": item["item"]
            }, business_id)
            add_note(phone, "Inventory matched: {} @ NGN {:,.0f}".format(
                item["item"], item["price"]), business_id)

    # Global: image/OCR hook
    if msg.startswith("http") and any(
        ext in msg.lower() for ext in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
    ):
        process_invoice(phone, msg, business_id)
        log_to_audit(phone, business_id, "IMAGE_RECEIVED", msg)
        return (
            "I've received and processed your document. "
            "Our team will review the details and follow up shortly."
        )

    # AWARENESS
    if stage == "AWARENESS":
        add_note(phone, "First contact: '{}'".format(msg), business_id)
        advance_stage(phone, business_id)
        return (
            "Welcome. You've reached a premium service. "
            "To assist you properly - what specific outcome are you looking for today?"
        )

    # INTENT
    elif stage == "INTENT":
        update_customer(phone, {"intent": msg}, business_id)
        add_note(phone, "Intent captured: '{}'".format(msg), business_id)
        advance_stage(phone, business_id)
        item = lookup_inventory(msg, business_id) if inv_keyword else None
        if item:
            return (
                "Understood - {}. We have that available. "
                "Our pricing starts from NGN {:,.0f}. "
                "What's your approximate budget?".format(item["item"], item["price"])
            )
        return (
            "Understood. '{}' - that's exactly what we specialize in. "
            "What's your approximate budget range?".format(msg)
        )

    # BUDGET
    elif stage == "BUDGET":
        update_customer(phone, {"budget": msg}, business_id)
        add_note(phone, "Budget stated: '{}'".format(msg), business_id)
        advance_stage(phone, business_id)
        return (
            "Good. Budget noted. "
            "One last thing before I prepare your proposal - "
            "how soon are you looking to move on this?"
        )

    # QUALIFICATION
    elif stage == "QUALIFICATION":
        add_note(phone, "Qualification response: '{}'".format(msg), business_id)
        advance_stage(phone, business_id)
        customer = get_customer(phone, business_id)
        price    = customer.get("quoted_price")
        item     = customer.get("active_inventory")
        if price and item:
            return (
                "Perfect. Based on everything you've shared, I have a tailored proposal. "
                "{} - our offer for you is NGN {:,.0f}. "
                "This includes full support and delivery. What are your thoughts?".format(item, price)
            )
        return (
            "Perfect. Based on everything you've shared, I have a tailored proposal ready. "
            "I'll send the details now - review and let me know your thoughts."
        )

    # NEGOTIATION
    elif stage == "NEGOTIATION":
        customer = get_customer(phone, business_id)
        quoted   = customer.get("quoted_price") or 0
        minimum  = quoted * 0.85 if quoted else 0

        result = negotiate_price(phone, business_id, quoted, minimum, msg)

        if result["triggered"]:
            add_note(phone, "Negotiation attempt. Blocked: {}. Price: {}".format(
                result["blocked"], result["new_price"]), business_id)
            return result["message"]
        else:
            add_note(phone, "Customer accepted terms.", business_id)
            advance_stage(phone, business_id)
            handover = trigger_handover(phone, business_id)
            alert_manager(handover["whatsapp_message"], business_id)
            return (
                "Excellent. Your file has been flagged as priority. "
                "Our sales manager will reach out directly within the hour to finalize everything."
            )

    # HANDOVER
    elif stage == "HANDOVER":
        if "urgent" in msg.lower():
            alert_manager(
                "URGENT - Lead {} needs immediate attention.\nMessage: {}".format(phone, msg),
                business_id
            )
            return (
                "Understood. I've flagged your message as URGENT. "
                "Expect a response within minutes."
            )
        return (
            "Your inquiry has been escalated to our sales team. "
            "Please expect a call or message shortly. "
            "Reply URGENT if you need immediate attention."
        )

    # AUDIT
    elif stage == "AUDIT":
        log_to_audit(phone, business_id, "POST_AUDIT_MESSAGE", msg)
        return (
            "This conversation has been completed and archived. "
            "For a new inquiry, please contact us through our main channel."
        )

    return "Message received. A team member will respond shortly."

# ------------------------------------------------------------------------------
#  RE-ENGAGEMENT ENGINE - score-gated
# ------------------------------------------------------------------------------
def run_reengagement(business_id):
    """
    Only re-engages leads that:
    1. Are not in HANDOVER or AUDIT
    2. Have not already received a re-engagement message
    3. Have been silent for 24+ hours
    4. Have a score >= REENGAGEMENT_MIN_SCORE (default 30)

    Below 30 = cold/unqualified. Don't waste Twilio credits on dead leads.
    """
    memory   = load_memory(business_id)
    now      = datetime.datetime.now()
    biz_name = get_config(business_id).get("business_name", "our team")

    for phone, customer in memory.items():
        if customer.get("stage") in SKIP_STAGES:
            continue
        if customer.get("reengagement_sent"):
            continue

        score = customer.get("score", 0)
        if score < REENGAGEMENT_MIN_SCORE:
            continue

        last_updated = customer.get("last_updated")
        if not last_updated:
            continue

        try:
            last_dt       = datetime.datetime.fromisoformat(last_updated)
            hours_elapsed = (now - last_dt).total_seconds() / 3600
        except ValueError:
            continue

        if hours_elapsed >= REENGAGEMENT_HOURS:
            message = (
                "Hi, I noticed we didn't finish our conversation at {}. "
                "Are you still interested in moving forward? "
                "Just reply and we'll pick up right where we left off.".format(biz_name)
            )
            sent = send_whatsapp(phone, message, business_id)
            if sent:
                mem = load_memory(business_id)
                if phone in mem:
                    mem[phone]["reengagement_sent"] = True
                    save_memory(mem, business_id)
                log_to_audit(
                    phone, business_id, "REENGAGEMENT_SENT",
                    "Score: {} ({}) | Stage: {} | Silent: {:.1f}h".format(
                        score, get_score_label(score),
                        customer.get("stage"), hours_elapsed
                    )
                )
                print("\033[36m  [RE-ENGAGE:{}] Sent to {} - Score {}\033[0m".format(
                    business_id, phone, score))

# ------------------------------------------------------------------------------
#  DAILY SALES REPORT
# ------------------------------------------------------------------------------
def send_daily_report(business_id):
    memory  = load_memory(business_id)
    config  = get_config(business_id)
    total   = len(memory)
    if total == 0:
        return

    stage_counts = {s: 0 for s in FUNNEL_STAGES}
    for customer in memory.values():
        s = customer.get("stage", "AWARENESS")
        stage_counts[s] = stage_counts.get(s, 0) + 1

    scores          = [c.get("score", 0) for c in memory.values()]
    avg_score       = sum(scores) / len(scores) if scores else 0
    hot_count       = sum(1 for s in scores if s >= 80)
    warm_count      = sum(1 for s in scores if 60 <= s < 80)
    cold_count      = sum(1 for s in scores if s < 30)
    handover_count  = stage_counts.get("HANDOVER", 0)
    audit_count     = stage_counts.get("AUDIT", 0)
    converted       = handover_count + audit_count
    conversion_rate = (converted / total * 100) if total > 0 else 0

    total_pipeline = sum(
        float(c.get("final_price") or c.get("quoted_price") or 0)
        for c in memory.values()
    )

    stage_breakdown = "\n".join(
        "  - {}: {}".format(stage, count)
        for stage, count in stage_counts.items()
        if count > 0
    )

    report = (
        "*NEXUS AI - DAILY REPORT*\n"
        "{}\n"
        "{}\n\n"
        "Total Leads      : {}\n"
        "In Handover      : {}\n"
        "Closed (Audit)   : {}\n"
        "Conversion Rate  : {:.1f}%\n"
        "Pipeline Value   : NGN {:,.0f}\n\n"
        "*Lead Quality:*\n"
        "  Avg Score : {:.0f}/100\n"
        "  HOT       : {}\n"
        "  WARM      : {}\n"
        "  COLD      : {}\n\n"
        "*Stage Breakdown:*\n{}\n\n"
        "Powered by Nexus AI {}"
    ).format(
        datetime.datetime.now().strftime("%A, %d %B %Y"),
        config.get("business_name", business_id),
        total, handover_count, audit_count,
        conversion_rate, total_pipeline,
        avg_score, hot_count, warm_count, cold_count,
        stage_breakdown, APP_VERSION
    )

    alert_manager(report, business_id)
    log_to_audit(
        "SYSTEM", business_id, "DAILY_REPORT_SENT",
        "Total: {} | Conversion: {:.1f}% | Avg Score: {:.0f}".format(
            total, conversion_rate, avg_score)
    )
    print("\033[36m  [REPORT:{}] Daily report dispatched.\033[0m".format(business_id))

# ------------------------------------------------------------------------------
#  BACKGROUND SCHEDULER THREAD
# ------------------------------------------------------------------------------
def background_scheduler():
    reports_sent = set()
    print("\033[90m  [SCHEDULER] Background thread started.\033[0m")

    while True:
        try:
            now     = datetime.datetime.now()
            configs = load_all_configs()

            for biz_id in configs:
                run_reengagement(biz_id)

                config      = configs[biz_id]
                report_time = config.get("report_time", "08:00")
                current_hm  = now.strftime("%H:%M")
                today_str   = now.strftime("%Y-%m-%d")
                report_key  = (biz_id, today_str)

                if current_hm == report_time and report_key not in reports_sent:
                    send_daily_report(biz_id)
                    reports_sent.add(report_key)

            today_str    = now.strftime("%Y-%m-%d")
            reports_sent = set(k for k in reports_sent if k[1] == today_str)

        except Exception as e:
            print("\033[31m  [SCHEDULER ERROR] {}\033[0m".format(e))

        time.sleep(60)

# ------------------------------------------------------------------------------
#  FLASK - WEBHOOK
# ------------------------------------------------------------------------------
@app.route("/webhook/<business_id>", methods=["GET"])
def webhook_verify(business_id):
    configs = load_all_configs()
    if business_id not in configs:
        return jsonify({"error": "Unknown business"}), 404

    mode      = request.args.get("hub.mode")
    token     = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")
    expected  = configs[business_id].get("verify_token", "")

    if mode == "subscribe" and token == expected:
        return challenge, 200
    return jsonify({"error": "Forbidden"}), 403


@app.route("/webhook/<business_id>", methods=["POST"])
def webhook_receive(business_id):
    if business_id not in load_all_configs():
        return jsonify({"error": "Unknown business"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid payload"}), 400

    try:
        entry    = data["entry"][0]
        changes  = entry["changes"][0]
        value    = changes["value"]
        message  = value["messages"][0]
        phone    = message["from"]
        msg_type = message.get("type", "text")

        if msg_type == "text":
            text = message.get("text", {}).get("body", "").strip()

        elif msg_type == "audio":
            media_id  = message["audio"]["id"]
            media_url = "https://graph.facebook.com/v19.0/{}".format(media_id)
            text      = transcribe_audio(media_url, business_id)
            log_to_audit(phone, business_id, "AUDIO_MESSAGE", media_url)

        elif msg_type == "image":
            media_id  = message["image"]["id"]
            media_url = "https://graph.facebook.com/v19.0/{}".format(media_id)
            text      = media_url

        else:
            return jsonify({"status": "ignored", "reason": "unsupported type: {}".format(msg_type)}), 200

        if not text:
            return jsonify({"status": "ignored", "reason": "empty message"}), 200

        reply = route_message(phone, text, business_id)

        print("\n\033[90m  [{}][{}] IN : {}\033[0m".format(business_id, phone, text[:80]))
        print("\033[36m  [{}][{}] OUT: {}\033[0m\n".format(business_id, phone, reply[:80]))

        send_whatsapp(phone, reply, business_id)
        return jsonify({"status": "processed"}), 200

    except (KeyError, IndexError) as e:
        print("\033[31m  [WEBHOOK:{}] Parse error: {}\033[0m".format(business_id, e))
        return jsonify({"status": "ignored", "reason": "malformed payload"}), 200

# ------------------------------------------------------------------------------
#  FLASK - BUSINESS MANAGEMENT
# ------------------------------------------------------------------------------
@app.route("/business/register", methods=["POST"])
def api_register_business():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid payload"}), 400

    business_id = data.get("business_id", "").strip().lower().replace(" ", "_")
    if not business_id:
        return jsonify({"error": "business_id is required"}), 400

    for field in ["business_name", "google_sheet_id", "manager_whatsapp"]:
        if not data.get(field):
            return jsonify({"error": "{} is required".format(field)}), 400

    config = {
        "business_name":    data["business_name"],
        "google_sheet_id":  data["google_sheet_id"],
        "manager_whatsapp": data["manager_whatsapp"],
        "twilio_sid":       data.get("twilio_sid", ""),
        "twilio_token":     data.get("twilio_token", ""),
        "twilio_from":      data.get("twilio_from", ""),
        "verify_token":     data.get("verify_token", "nexus_{}_token".format(business_id)),
        "report_time":      data.get("report_time", "08:00")
    }

    register_business_config(business_id, config)
    return jsonify({
        "status":       "registered",
        "business_id":  business_id,
        "webhook_url":  "/webhook/{}".format(business_id),
        "verify_token": config["verify_token"]
    }), 201


@app.route("/business/list", methods=["GET"])
def api_list_businesses():
    configs = load_all_configs()
    return jsonify({
        biz_id: {
            "name":        c.get("business_name"),
            "manager":     c.get("manager_whatsapp"),
            "report_time": c.get("report_time"),
            "leads":       len(load_memory(biz_id))
        }
        for biz_id, c in configs.items()
    }), 200

# ------------------------------------------------------------------------------
#  FLASK - LEAD MANAGEMENT
# ------------------------------------------------------------------------------
@app.route("/business/<business_id>/leads", methods=["GET"])
def api_list_leads(business_id):
    if business_id not in load_all_configs():
        return jsonify({"error": "Unknown business"}), 404

    memory    = load_memory(business_id)
    min_score = request.args.get("min_score", type=int)

    if min_score is not None:
        memory = {
            phone: c for phone, c in memory.items()
            if c.get("score", 0) >= min_score
        }

    if request.args.get("sort") == "score":
        memory = dict(
            sorted(memory.items(), key=lambda x: x[1].get("score", 0), reverse=True)
        )

    return jsonify(memory), 200


@app.route("/business/<business_id>/lead/<phone>", methods=["GET"])
def api_inspect_lead(business_id, phone):
    if business_id not in load_all_configs():
        return jsonify({"error": "Unknown business"}), 404
    customer = get_customer(phone, business_id)
    customer["score_label"] = get_score_label(customer.get("score", 0))
    return jsonify(customer), 200


@app.route("/business/<business_id>/reset/<phone>", methods=["POST"])
def api_reset_lead(business_id, phone):
    memory = load_memory(business_id)
    if phone in memory:
        del memory[phone]
        save_memory(memory, business_id)
        return jsonify({"status": "reset", "phone": phone}), 200
    return jsonify({"error": "Phone not found"}), 404

# ------------------------------------------------------------------------------
#  FLASK - BROADCAST
# ------------------------------------------------------------------------------
@app.route("/business/<business_id>/broadcast", methods=["POST"])
def api_broadcast(business_id):
    if business_id not in load_all_configs():
        return jsonify({"error": "Unknown business"}), 404

    data      = request.get_json(silent=True)
    message   = (data.get("message", "") if data else "").strip()
    min_score = int(data.get("min_score", 0)) if data else 0

    if not message:
        return jsonify({"error": "message is required"}), 400

    contacts = get_broadcast_list(business_id)
    if not contacts:
        return jsonify({"error": "Broadcast tab is empty or Sheets not configured"}), 400

    if min_score > 0:
        memory   = load_memory(business_id)
        contacts = [
            c for c in contacts
            if memory.get(c["phone"], {}).get("score", 0) >= min_score
        ]

    sent, failed, results = 0, 0, []

    for contact in contacts:
        phone        = contact["phone"]
        name         = contact["name"] or "there"
        personalized = message.replace("{name}", name)
        success      = send_whatsapp(phone, personalized, business_id)
        timestamp    = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        status       = "Sent {}".format(timestamp) if success else "Failed"
        update_broadcast_status(business_id, contact["row_index"], status)
        sent    += 1 if success else 0
        failed  += 0 if success else 1
        results.append({"phone": phone, "sent": success})
        time.sleep(1)

    log_to_audit(
        "SYSTEM", business_id, "BROADCAST_SENT",
        "Sent: {} | Failed: {} | Min score: {}".format(sent, failed, min_score)
    )
    return jsonify({"sent": sent, "failed": failed, "results": results}), 200

# ------------------------------------------------------------------------------
#  FLASK - REPORT ON DEMAND
# ------------------------------------------------------------------------------
@app.route("/business/<business_id>/report", methods=["POST"])
def api_force_report(business_id):
    if business_id not in load_all_configs():
        return jsonify({"error": "Unknown business"}), 404
    send_daily_report(business_id)
    return jsonify({"status": "report sent"}), 200

# ------------------------------------------------------------------------------
#  FLASK - SCORE ENDPOINTS
# ------------------------------------------------------------------------------
@app.route("/business/<business_id>/scores", methods=["GET"])
def api_scores(business_id):
    if business_id not in load_all_configs():
        return jsonify({"error": "Unknown business"}), 404

    memory = load_memory(business_id)
    ranked = sorted(
        [
            {
                "phone":        phone,
                "name":         c.get("name") or "Unknown",
                "stage":        c.get("stage"),
                "score":        c.get("score", 0),
                "score_label":  get_score_label(c.get("score", 0)),
                "intent":       c.get("intent"),
                "budget":       c.get("budget"),
                "last_updated": c.get("last_updated")
            }
            for phone, c in memory.items()
        ],
        key=lambda x: x["score"],
        reverse=True
    )
    return jsonify({"leads": ranked, "total": len(ranked)}), 200


@app.route("/business/<business_id>/lead/<phone>/score", methods=["GET"])
def api_get_score(business_id, phone):
    if business_id not in load_all_configs():
        return jsonify({"error": "Unknown business"}), 404
    score = refresh_score(phone, business_id)
    return jsonify({
        "phone": phone,
        "score": score,
        "label": get_score_label(score)
    }), 200

# ------------------------------------------------------------------------------
#  FLASK - HEALTH
# ------------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health_check():
    configs = load_all_configs()
    return jsonify({
        "status":                  "online",
        "version":                 APP_VERSION,
        "businesses":              len(configs),
        "sheets_enabled":          SHEETS_AVAILABLE and os.path.exists(CREDS_FILE),
        "twilio_enabled":          TWILIO_AVAILABLE,
        "ocr_enabled":             OCR_AVAILABLE,
        "reengagement_min_score":  REENGAGEMENT_MIN_SCORE
    }), 200

# ------------------------------------------------------------------------------
#  ENTRY POINT
# ------------------------------------------------------------------------------
def main():
    welcome_banner()

    # hardware_lock()  # <-- disabled for mobile deployment

    # Migrate old single-business config.json -> configs.json
    if os.path.exists("config.json") and not os.path.exists(CONFIGS_FILE):
        print("\033[33m  [MIGRATE] Found config.json - converting to multi-business format...\033[0m")
        with open("config.json", "r") as f:
            old = json.load(f)
        old.setdefault("verify_token", "nexus_default_token")
        old.setdefault("report_time",  "08:00")
        register_business_config("default", old)
        print("\033[32m  OK  Migrated as business_id: 'default'\033[0m\n")

    configs = load_all_configs()
    if not configs:
        first_time_setup()
        configs = load_all_configs()

    print("\033[36m  Loaded {} business client(s):\033[0m".format(len(configs)))
    for biz_id, config in configs.items():
        lead_count = len(load_memory(biz_id))
        print(
            "\n    \033[90m[{}]\033[0m {}\n"
            "    Webhook : /webhook/{}\n"
            "    Leads   : {}\n"
            "    Report  : {}".format(
                biz_id,
                config.get("business_name"),
                biz_id,
                lead_count,
                config.get("report_time", "08:00")
            )
        )

    print("\n\033[90m  " + "-" * 50 + "\033[0m")
    print("  \033[36mSheets  :\033[0m {}".format(
        "ready" if os.path.exists(CREDS_FILE) else "credentials.json missing"))
    print("  \033[36mTwilio  :\033[0m {}".format(
        "available" if TWILIO_AVAILABLE else "not installed"))
    print("  \033[36mOCR     :\033[0m {}".format(
        "ready" if OCR_AVAILABLE else "disabled"))
    print("  \033[36mScoring :\033[0m enabled - re-engage threshold: {}/100".format(
        REENGAGEMENT_MIN_SCORE))
    print("\n\033[90m  " + "-" * 50 + "\033[0m")

    scheduler_thread = threading.Thread(target=background_scheduler, daemon=True)
    scheduler_thread.start()
    print("  \033[32mOK  Scheduler online (re-engagement + daily reports)\033[0m")
    print("  \033[32mOK  Nexus AI is live. Starting webhook server...\033[0m\n")

    import os
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
