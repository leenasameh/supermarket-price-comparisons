import json
import re
import io
import hashlib
from PIL import Image
from google import genai
import streamlit as st


MODEL_NAME = "gemini-3.6-flash"


# ---------------------------------------
# Gemini Client
# ---------------------------------------

def get_client():

    api_key = st.secrets.get(
        "GEMINI_API_KEY",
        ""
    )

    if not api_key:
        raise ValueError(
            "Gemini API Key is missing."
        )

    return genai.Client(
        api_key=api_key
    )


# ---------------------------------------
# Resize image
# ---------------------------------------

def optimize_image(image):

    image = image.convert("RGB")

    max_size = 1600

    width, height = image.size

    if max(width, height) > max_size:

        ratio = (
            max_size
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

    return image


# ---------------------------------------
# Convert image → bytes
# ---------------------------------------

def image_to_bytes(image):

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="JPEG",
        quality=85,
        optimize=True
    )

    return buffer.getvalue()


# ---------------------------------------
# JSON cleaner
# ---------------------------------------

def clean_json(text):

    if not text:
        return "[]"

    text = text.strip()

    text = re.sub(
        r"```json",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"```",
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


# ---------------------------------------
# Number helpers
# ---------------------------------------

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

    except:
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

    except:
        return default


# ---------------------------------------
# CACHE
# ---------------------------------------

@st.cache_data(
    show_spinner=False,
    ttl=3600
)
def extract_products_cached(
    image_bytes
):

    client = get_client()

    image = Image.open(
        io.BytesIO(
            image_bytes
        )
    )

    prompt = """
Read this supermarket promotional flyer.

Extract every clearly visible product that has
a readable current price.

Return ONLY JSON.

No markdown.
No explanation.

Format:

[
 {
   "name": "product name",
   "brand": "brand",
   "price": 45,
   "old_price": null,
   "quantity": 1,
   "unit": "L",
   "package_count": 1,
   "notes": ""
 }
]

Rules:

price = current offer price.

old_price = previous crossed-out price.
Use null if unavailable.

quantity = quantity of ONE package.

package_count = number of packages included
in the displayed price.

Examples:

1 L milk:
quantity = 1
unit = "L"
package_count = 1

1.5 L oil:
quantity = 1.5
unit = "L"
package_count = 1

2 x 1 L:
quantity = 1
unit = "L"
package_count = 2

6 x 330 ml:
quantity = 330
unit = "ml"
package_count = 6

750g + 250g free:
quantity = 1000
unit = "g"
package_count = 1

Buy 2 Get 1 Free:
package_count = 3
notes = "Buy 2 Get 1 Free"

Allowed units ONLY:

kg
g
L
ml
piece
pack

If quantity is unknown:

quantity = 1
unit = "piece"
package_count = 1

Keep Arabic names in Arabic.
Keep English names in English.

Do not extract:
headings
advertising text
phone numbers
category names

Never invent a price.
"""

    response = (
        client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                prompt,
                image
            ]
        )
    )

    text = clean_json(
        response.text
    )

    try:

        data = json.loads(
            text
        )

    except:

        raise ValueError(
            "AI response could not "
            "be converted to product data."
        )

    products = []

    if not isinstance(
        data,
        list
    ):
        return products

    for item in data:

        if not isinstance(
            item,
            dict
        ):
            continue

        name = str(
            item.get(
                "name",
                ""
            )
        ).strip()

        price = safe_float(
            item.get(
                "price"
            )
        )

        if (
            not name
            or price is None
            or price <= 0
        ):
            continue

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

        package_count = (
            safe_int(
                item.get(
                    "package_count"
                ),
                1
            )
        )

        unit = str(
            item.get(
                "unit",
                "piece"
            )
        ).strip()

        unit_map = {

            "l": "L",
            "liter": "L",
            "litre": "L",
            "لتر": "L",

            "ml": "ml",
            "مل": "ml",

            "kg": "kg",
            "kilogram": "kg",
            "كيلو": "kg",

            "g": "g",
            "gram": "g",
            "جرام": "g",

            "piece": "piece",
            "pieces": "piece",
            "قطعة": "piece",
            "قطعه": "piece",

            "pack": "pack",
            "packs": "pack",
            "عبوة": "pack",
            "عبوه": "pack"
        }

        unit = unit_map.get(
            unit.lower(),
            unit
        )

        products.append(
            {

                "name": name,

                "brand": str(
                    item.get(
                        "brand",
                        ""
                    )
                ).strip(),

                "price": price,

                "old_price":
                    safe_float(
                        item.get(
                            "old_price"
                        )
                    ),

                "quantity":
                    quantity,

                "unit":
                    unit,

                "package_count":
                    package_count,

                "notes":
                    str(
                        item.get(
                            "notes",
                            ""
                        )
                    ).strip()
            }
        )

    return products


# ---------------------------------------
# Main extraction
# ---------------------------------------

def extract_products(
    image
):

    optimized = (
        optimize_image(
            image
        )
    )

    image_bytes = (
        image_to_bytes(
            optimized
        )
    )

    return (
        extract_products_cached(
            image_bytes
        )
    )