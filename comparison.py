import re

from rapidfuzz import fuzz


# ---------------------------------------
# Text normalization
# ---------------------------------------

def normalize_arabic(text):

    replacements = {

        "أ": "ا",
        "إ": "ا",
        "آ": "ا",

        "ة": "ه",

        "ى": "ي",

        "ؤ": "و",

        "ئ": "ي"
    }

    for old, new in (
        replacements.items()
    ):

        text = text.replace(
            old,
            new
        )

    text = re.sub(
        r"[\u064B-\u065F\u0670]",
        "",
        text
    )

    return text


def normalize_name(name):

    if not name:
        return ""

    name = (
        str(name)
        .lower()
        .strip()
    )

    name = normalize_arabic(
        name
    )

    name = re.sub(
        r"[^\w\s\u0600-\u06FF]",
        " ",
        name
    )

    name = re.sub(
        r"\s+",
        " ",
        name
    )

    return name.strip()


# ---------------------------------------
# Quantity
# ---------------------------------------

def total_quantity(
    product
):

    try:

        quantity = float(
            product.get(
                "quantity",
                1
            )
        )

    except:

        quantity = 1

    try:

        count = int(
            product.get(
                "package_count",
                1
            )
        )

    except:

        count = 1

    return (
        quantity
        *
        count
    )


# ---------------------------------------
# Convert units
# ---------------------------------------

def base_quantity(
    product
):

    quantity = total_quantity(
        product
    )

    unit = str(
        product.get(
            "unit",
            "piece"
        )
    ).lower()

    if unit == "kg":

        return (
            quantity * 1000,
            "g"
        )

    if unit == "g":

        return (
            quantity,
            "g"
        )

    if unit == "l":

        return (
            quantity * 1000,
            "ml"
        )

    if unit == "ml":

        return (
            quantity,
            "ml"
        )

    if unit in [
        "piece",
        "pieces"
    ]:

        return (
            quantity,
            "piece"
        )

    if unit in [
        "pack",
        "packs"
    ]:

        return (
            quantity,
            "pack"
        )

    return (
        quantity,
        unit
    )


# ---------------------------------------
# Unit price
# ---------------------------------------

def unit_price(
    product
):

    quantity, unit = (
        base_quantity(
            product
        )
    )

    try:

        price = float(
            product[
                "price"
            ]
        )

    except:

        return None

    if (
        quantity <= 0
        or price <= 0
    ):

        return None

    return {

        "value":
            price / quantity,

        "unit":
            unit,

        "quantity":
            quantity
    }


# ---------------------------------------
# Similarity
# ---------------------------------------

def similarity(
    product1,
    product2
):

    name1 = normalize_name(
        product1.get(
            "name",
            ""
        )
    )

    name2 = normalize_name(
        product2.get(
            "name",
            ""
        )
    )

    if (
        not name1
        or not name2
    ):
        return 0

    token = fuzz.token_set_ratio(
        name1,
        name2
    )

    partial = fuzz.partial_ratio(
        name1,
        name2
    )

    ratio = fuzz.ratio(
        name1,
        name2
    )

    score = (
        token * 0.55
        +
        partial * 0.25
        +
        ratio * 0.20
    )

    brand1 = normalize_name(
        product1.get(
            "brand",
            ""
        )
    )

    brand2 = normalize_name(
        product2.get(
            "brand",
            ""
        )
    )

    if brand1 and brand2:

        brand_score = (
            fuzz.ratio(
                brand1,
                brand2
            )
        )

        score = (
            score * 0.85
            +
            brand_score * 0.15
        )

    return score


# ---------------------------------------
# Group products
# ---------------------------------------

def group_products(
    offers,
    threshold=68
):

    groups = []

    for offer_index, offer in enumerate(
        offers
    ):

        for product in offer[
            "products"
        ]:

            best_group = None
            best_score = 0

            for group in groups:

                # A group cannot have
                # two products from same offer

                if (
                    offer_index
                    in group["products"]
                ):
                    continue

                scores = []

                for existing in (
                    group[
                        "products"
                    ].values()
                ):

                    scores.append(
                        similarity(
                            product,
                            existing
                        )
                    )

                if not scores:
                    continue

                score = max(
                    scores
                )

                if score > best_score:

                    best_score = score
                    best_group = group


            if (
                best_group
                and best_score
                >= threshold
            ):

                best_group[
                    "products"
                ][offer_index] = (
                    product
                )

            else:

                groups.append(
                    {

                        "name":
                            product.get(
                                "name",
                                "Product"
                            ),

                        "products":
                            {
                                offer_index:
                                    product
                            }
                    }
                )

    return groups


# ---------------------------------------
# Analyze groups
# ---------------------------------------

def compare_all_offers(
    offers
):

    groups = group_products(
        offers
    )

    results = []

    for group in groups:

        prices = {}

        for (
            offer_index,
            product
        ) in (
            group[
                "products"
            ].items()
        ):

            data = unit_price(
                product
            )

            if data:

                prices[
                    offer_index
                ] = data


        comparable = False
        winner = None


        if len(prices) >= 2:

            units = {

                item["unit"]

                for item
                in prices.values()
            }


            if len(units) == 1:

                comparable = True

                winner = min(
                    prices,
                    key=lambda i:
                        prices[i][
                            "value"
                        ]
                )


        results.append(
            {

                "name":
                    group["name"],

                "products":
                    group[
                        "products"
                    ],

                "unit_prices":
                    prices,

                "winner_index":
                    winner,

                "comparable":
                    comparable,

                "found_count":
                    len(
                        group[
                            "products"
                        ]
                    )
            }
        )

    return results