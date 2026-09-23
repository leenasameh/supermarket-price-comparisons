import io
import json
import re
import time

import streamlit as st
from google import genai
from PIL import Image


# ==========================================
# SETTINGS
# ==========================================

MODEL_NAME = "gemini-3.6-flash"

MAX_RETRIES = 3

MAX_IMAGE_DIMENSION = 1600

JPEG_QUALITY = 85


# ==========================================
# GEMINI CLIENT
# ==========================================

def get_client():

    try:
        api_key = st.secrets["GEMINI_API_KEY"]

    except Exception:
        api_key = ""

    if not api_key:

        raise ValueError(
            "Gemini API Key is missing. "
            "Add GEMINI_API_KEY to Streamlit Secrets."
        )

    return genai.Client(
        api_key=api_key
    )


# ==========================================
# IMAGE OPTIMIZATION
# ==========================================

def optimize_image_bytes(file_bytes):

    image = Image.open(
        io.BytesIO(file_bytes)
    ).convert("RGB")

    width, height = image.size

    if max(width, height) > MAX_IMAGE_DIMENSION:

        ratio = (
            MAX_IMAGE_DIMENSION
            /
            max(width, height)
        )

        new_width = int(
            width * ratio
        )

        new_height = int(
            height * ratio
        )

        image = image.resize(
            (
                new_width,
                new_height
            ),
            Image.Resampling.LANCZOS
        )

    output = io.BytesIO()

    image.save(
        output,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True
    )

    return output.getvalue()


# ==========================================
# JSON CLEANER
# ==========================================

def clean_json_text(text):

    if not text:
        return "[]"

    text = text.strip()

    text = re.sub(
        r"^```json\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"^```\s*",
        "",
        text
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    start = text.find("[")
    end = text.rfind("]")

    if (
        start != -1
        and end != -1
    ):
        text = text[
            start:end + 1
        ]

    return text.strip()


# ==========================================
# SAFE NUMBER HELPERS
# ==========================================

def safe_float(
    value,
    default=None
):

    try:

        if value is None:
            return default

        value = (
            str(value)
            .replace(",", ".")
            .strip()
        )

        return float(value)

    except (ValueError, TypeError):

        return default


def safe_int(
    value,
    default=1
):

    try:

        value = int(
            float(value)
        )

        if value <= 0:
            return default

        return value

    except (ValueError, TypeError):

        return default


# ==========================================
# PRODUCT CLEANING
# ==========================================

def normalize_product(item):

    if not isinstance(
        item,
        dict
    ):
        return None


    # ------------------------------
    # NAME
    # ------------------------------

    name = str(
        item.get(
            "name",
            ""
        )
    ).strip()

    if not name:
        return None


    # ------------------------------
    # PRICE
    # ------------------------------

    price = safe_float(
        item.get(
            "price"
        ),
        None
    )

    if (
        price is None
        or price <= 0
    ):
        return None


    # ------------------------------
    # OLD PRICE
    # ------------------------------

    old_price = safe_float(
        item.get(
            "old_price"
        ),
        None
    )


    # ------------------------------
    # QUANTITY
    # ------------------------------

    quantity = safe_float(
        item.get(
            "quantity"
        ),
        1
    )

    if (
        quantity is None
        or quantity <= 0
    ):
        quantity = 1


    # ------------------------------
    # PACKAGE COUNT
    # ------------------------------

    package_count = safe_int(
        item.get(
            "package_count"
        ),
        1
    )


    # ------------------------------
    # UNIT
    # ------------------------------

    unit = str(
        item.get(
            "unit",
            "piece"
        )
    ).strip()


    unit_map = {

        # Liter
        "l": "L",
        "liter": "L",
        "litre": "L",
        "liters": "L",
        "litres": "L",
        "لتر": "L",

        # Milliliter
        "ml": "ml",
        "milliliter": "ml",
        "milliliters": "ml",
        "millilitre": "ml",
        "millilitres": "ml",
        "مل": "ml",

        # Kilogram
        "kg": "kg",
        "kilogram": "kg",
        "kilograms": "kg",
        "كيلو": "kg",
        "كيلوجرام": "kg",

        # Gram
        "g": "g",
        "gram": "g",
        "grams": "g",
        "جرام": "g",

        # Piece
        "piece": "piece",
        "pieces": "piece",
        "pc": "piece",
        "pcs": "piece",
        "قطعة": "piece",
        "قطعه": "piece",

        # Pack
        "pack": "pack",
        "packs": "pack",
        "عبوة": "pack",
        "عبوه": "pack"
    }


    unit = unit_map.get(
        unit.lower(),
        unit
    )


    allowed_units = {
        "kg",
        "g",
        "L",
        "ml",
        "piece",
        "pack"
    }


    if unit not in allowed_units:
        unit = "piece"


    # ------------------------------
    # BRAND
    # ------------------------------

    brand = str(
        item.get(
            "brand",
            ""
        )
    ).strip()


    # ------------------------------
    # NOTES
    # ------------------------------

    notes = str(
        item.get(
            "notes",
            ""
        )
    ).strip()


    return {

        "name":
            name,

        "brand":
            brand,

        "price":
            price,

        "old_price":
            old_price,

        "quantity":
            quantity,

        "unit":
            unit,

        "package_count":
            package_count,

        "notes":
            notes
    }


# ==========================================
# PROMPT
# ==========================================

PROMPT = """
You are an expert supermarket flyer reader.

You will receive one or more images.

IMPORTANT:
ALL supplied images belong to the SAME supermarket offer.

The images may be different pages of the same flyer.

Your job is to carefully analyze ALL supplied images
and extract EVERY clearly visible product that has
a readable current promotional price.

Return ONE combined JSON array containing the products
from ALL supplied pages.

Return ONLY valid JSON.

DO NOT:
- return markdown
- return explanations
- return comments
- invent products
- invent prices
- invent package sizes

Use this exact JSON structure:

[
    {
        "name": "Product name",
        "brand": "Brand name",
        "price": 45.0,
        "old_price": 50.0,
        "quantity": 1.0,
        "unit": "L",
        "package_count": 1,
        "notes": ""
    }
]

========================================
PRICE
========================================

price = the CURRENT promotional price.

Example:

Old price: 55 EGP
Offer price: 45 EGP

Return:

"price": 45
"old_price": 55

If the old price is not clearly visible:

"old_price": null


========================================
QUANTITY
========================================

quantity represents the quantity
of ONE package.

package_count represents how many
packages the customer receives.


Example:

Milk 1 Liter

quantity = 1
unit = "L"
package_count = 1


Example:

Oil 1.5 Liter

quantity = 1.5
unit = "L"
package_count = 1


Example:

2 × 1 Liter

quantity = 1
unit = "L"
package_count = 2


Example:

6 × 330 ml

quantity = 330
unit = "ml"
package_count = 6


Example:

3 pieces

quantity = 1
unit = "piece"
package_count = 3


========================================
FREE QUANTITY
========================================

Example:

750 g + 250 g FREE

Return:

quantity = 1000
unit = "g"
package_count = 1
notes = "750g + 250g free"


Example:

Buy 2 Get 1 Free

Return:

quantity = 1
package_count = 3
notes = "Buy 2 Get 1 Free"


========================================
ALLOWED UNITS
========================================

Use ONLY:

kg
g
L
ml
piece
pack


========================================
UNKNOWN SIZE
========================================

If the price is readable but the package
size cannot be determined:

quantity = 1
unit = "piece"
package_count = 1


========================================
LANGUAGE
========================================

If the product name is written in Arabic,
keep it in Arabic.

If the product name is written in English,
keep it in English.

Do not unnecessarily translate product names.


========================================
BRAND
========================================

Only include the brand when it is clearly visible.

If it is not clearly visible:

"brand": ""


========================================
DO NOT EXTRACT
========================================

Do NOT extract:

- headings
- category names
- store names
- phone numbers
- QR codes
- advertising slogans
- decorative text
- dates
- addresses


========================================
DUPLICATES
========================================

If the EXACT same product appears more than once
across the supplied pages with the same price
and package size, include it only once.


========================================
IMPORTANT
========================================

Read every supplied image carefully.

Never guess an unreadable price.

Extract as many clearly readable products
as possible.

Return ONLY the JSON array.
"""


# ==========================================
# GEMINI REQUEST WITH RETRY
# ==========================================

def send_to_gemini(
    images_tuple
):

    client = get_client()

    contents = [
        PROMPT
    ]


    # Add all images to the SAME request
    for image_bytes in images_tuple:

        image = Image.open(
            io.BytesIO(
                image_bytes
            )
        ).convert(
            "RGB"
        )

        contents.append(
            image
        )


    # ======================================
    # RETRY LOOP
    # ======================================

    for attempt in range(
        MAX_RETRIES + 1
    ):

        try:

            response = (
                client.models.generate_content(
                    model=MODEL_NAME,
                    contents=contents
                )
            )

            # Request succeeded
            return response


        except Exception as error:

            error_text = str(
                error
            )


            # ==================================
            # 503 SERVER BUSY
            # ==================================

            is_503 = (
                "503" in error_text
                or
                "UNAVAILABLE"
                in error_text
                or
                "high demand"
                in error_text.lower()
            )


            if is_503:

                # Retry if attempts remain
                if attempt < MAX_RETRIES:

                    wait_time = (
                        3
                        *
                        (
                            2 ** attempt
                        )
                    )

                    time.sleep(
                        wait_time
                    )

                    continue


                # No attempts left
                raise RuntimeError(
                    "Gemini is currently busy "
                    "because of high demand. "
                    "Please wait a minute "
                    "and try again."
                )


            # ==================================
            # 429 QUOTA
            # ==================================

            is_429 = (
                "429" in error_text
                or
                "RESOURCE_EXHAUSTED"
                in error_text
                or
                "quota"
                in error_text.lower()
            )


            if is_429:

                raise RuntimeError(
                    "Gemini usage limit has "
                    "been reached. "
                    "Please try again later."
                )


            # ==================================
            # OTHER GEMINI ERROR
            # ==================================

            raise RuntimeError(
                f"Gemini error: {error}"
            )


    raise RuntimeError(
        "Gemini request failed."
    )


# ==========================================
# CACHE
# ==========================================

@st.cache_data(
    show_spinner=False,
    ttl=3600
)
def extract_offer_products_cached(
    images_tuple
):

    response = send_to_gemini(
        images_tuple
    )


    # ======================================
    # GET RESPONSE TEXT
    # ======================================

    response_text = getattr(
        response,
        "text",
        None
    )


    if not response_text:

        raise ValueError(
            "Gemini returned an empty response."
        )


    # ======================================
    # CLEAN JSON
    # ======================================

    cleaned_text = clean_json_text(
        response_text
    )


    # ======================================
    # PARSE JSON
    # ======================================

    try:

        data = json.loads(
            cleaned_text
        )

    except json.JSONDecodeError as error:

        raise ValueError(
            "Gemini returned product data "
            "that could not be read. "
            "Please try again."
        ) from error


    if not isinstance(
        data,
        list
    ):

        raise ValueError(
            "Gemini did not return "
            "a product list."
        )


    # ======================================
    # CLEAN PRODUCTS
    # ======================================

    products = []


    for item in data:

        product = normalize_product(
            item
        )

        if product is not None:

            products.append(
                product
            )


    return products


# ==========================================
# PUBLIC FUNCTION
# ==========================================

def extract_offer_products(
    files
):

    if not files:
        return []


    optimized_images = []


    # Optimize every uploaded page
    for file in files:

        file_bytes = (
            file.getvalue()
        )

        optimized_bytes = (
            optimize_image_bytes(
                file_bytes
            )
        )

        optimized_images.append(
            optimized_bytes
        )


    # Tuple makes the input cacheable
    images_tuple = tuple(
        optimized_images
    )


    # ONE cached Gemini request
    # for the whole supermarket offer
    return extract_offer_products_cached(
        images_tuple
    )
