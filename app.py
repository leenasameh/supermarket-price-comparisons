import streamlit as st

from PIL import Image

from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed
)

import io

from gemini_service import (
    extract_products
)

from comparison import (
    compare_all_offers
)


# =========================================
# PAGE
# =========================================

st.set_page_config(
    page_title="Offer Compare",
    page_icon="🛒",
    layout="wide"
)


# =========================================
# STYLE
# =========================================

st.markdown(
    """
<style>

.block-container {
    max-width: 1300px;
    padding-top: 2rem;
}

.hero {
    text-align: center;
    padding-bottom: 25px;
}

.hero h1 {
    font-size: 45px;
    margin-bottom: 5px;
}

.hero p {
    opacity: .7;
    font-size: 17px;
}

.price-box {
    border: 1px solid rgba(128,128,128,.25);
    padding: 15px;
    border-radius: 14px;
}

@media(max-width:700px) {

    .hero h1 {
        font-size: 32px;
    }

}

</style>
""",
    unsafe_allow_html=True
)


# =========================================
# HERO
# =========================================

st.markdown(
    """
<div class="hero">

<h1>
🛒 Offer Compare
</h1>

<p>
Compare supermarket offers
based on price and quantity
</p>

</div>
""",
    unsafe_allow_html=True
)


# =========================================
# OFFER NUMBER
# =========================================

offer_count = st.number_input(
    "Number of offers",
    min_value=2,
    max_value=10,
    value=2,
    step=1
)

offer_count = int(
    offer_count
)


st.caption(
    "Compare between 2 and 10 offers."
)


st.divider()


# =========================================
# INPUTS
# =========================================

offer_inputs = []


for i in range(
    offer_count
):

    st.subheader(
        f"📄 Offer {i + 1}"
    )


    name = st.text_input(
        "Offer name",
        value=f"Offer {i + 1}",
        key=f"name_{i}"
    )


    files = st.file_uploader(
        "Upload flyer images",
        type=[
            "jpg",
            "jpeg",
            "png",
            "webp"
        ],
        accept_multiple_files=True,
        key=f"files_{i}"
    )


    offer_inputs.append(
        {

            "name":
                name,

            "files":
                files
        }
    )


    st.divider()


# =========================================
# BUTTON
# =========================================

start = st.button(
    "⚡ Compare Offers",
    type="primary",
    use_container_width=True
)


# =========================================
# HELPERS
# =========================================

def format_number(
    number
):

    try:

        number = float(
            number
        )

        if number.is_integer():

            return str(
                int(number)
            )

        return f"{number:g}"

    except:

        return str(
            number
        )


def package_text(
    product
):

    quantity = product.get(
        "quantity",
        1
    )

    unit = product.get(
        "unit",
        "piece"
    )

    count = product.get(
        "package_count",
        1
    )


    if count > 1:

        return (
            f"{count} × "
            f"{format_number(quantity)} "
            f"{unit}"
        )


    return (
        f"{format_number(quantity)} "
        f"{unit}"
    )


def unit_price_text(
    data
):

    if not data:

        return "Unknown"


    value = data[
        "value"
    ]

    unit = data[
        "unit"
    ]


    if unit == "g":

        return (
            f"{value * 1000:.2f} "
            f"EGP/kg"
        )


    if unit == "ml":

        return (
            f"{value * 1000:.2f} "
            f"EGP/L"
        )


    return (
        f"{value:.2f} "
        f"EGP/{unit}"
    )


def show_product(
    product,
    price_data=None
):

    st.markdown(
        "### "
        +
        product.get(
            "name",
            "Product"
        )
    )


    brand = product.get(
        "brand",
        ""
    )


    if brand:

        st.caption(
            brand
        )


    st.write(
        "💰 **Price:** "
        +
        format_number(
            product.get(
                "price",
                0
            )
        )
        +
        " EGP"
    )


    st.write(
        "📦 **Size:** "
        +
        package_text(
            product
        )
    )


    if price_data:

        st.write(
            "📊 **Unit price:** "
            +
            unit_price_text(
                price_data
            )
        )


    old_price = product.get(
        "old_price"
    )


    if old_price:

        st.write(
            "🏷️ **Old:** "
            +
            format_number(
                old_price
            )
            +
            " EGP"
        )


    notes = product.get(
        "notes",
        ""
    )


    if notes:

        st.caption(
            notes
        )


# =========================================
# IMAGE PROCESSING FUNCTION
# =========================================

def process_file(
    offer_index,
    file_bytes
):

    image = Image.open(
        io.BytesIO(
            file_bytes
        )
    ).convert(
        "RGB"
    )


    products = extract_products(
        image
    )


    return (
        offer_index,
        products
    )


# =========================================
# START
# =========================================

if start:

    # -------------------------------------
    # Validate
    # -------------------------------------

    for offer in offer_inputs:

        if not offer[
            "files"
        ]:

            st.error(
                "Please upload at least "
                "one image for every offer."
            )

            st.stop()


    # -------------------------------------
    # Prepare
    # -------------------------------------

    offers = []


    for i, offer in enumerate(
        offer_inputs
    ):

        name = (
            offer[
                "name"
            ].strip()
            or
            f"Offer {i + 1}"
        )


        offers.append(
            {

                "name":
                    name,

                "products":
                    []
            }
        )


    jobs = []


    for offer_index, offer in enumerate(
        offer_inputs
    ):

        for file in offer[
            "files"
        ]:

            jobs.append(
                (

                    offer_index,

                    file.getvalue()
                )
            )


    total_jobs = len(
        jobs
    )


    # -------------------------------------
    # Parallel processing
    # -------------------------------------

    progress = st.progress(
        0
    )


    status = st.empty()


    status.info(
        f"🤖 Reading {total_jobs} "
        f"flyer image(s)..."
    )


    completed = 0


    try:

        # Keep this conservative because
        # Gemini API has rate limits.

        max_workers = min(
            3,
            total_jobs
        )


        with ThreadPoolExecutor(
            max_workers=max_workers
        ) as executor:


            futures = []


            for (
                offer_index,
                file_bytes
            ) in jobs:


                future = executor.submit(
                    process_file,
                    offer_index,
                    file_bytes
                )


                futures.append(
                    future
                )


            for future in as_completed(
                futures
            ):


                (
                    offer_index,
                    products
                ) = future.result()


                offers[
                    offer_index
                ][
                    "products"
                ].extend(
                    products
                )


                completed += 1


                progress.progress(
                    completed
                    /
                    total_jobs
                )


                status.info(
                    f"🤖 Processed "
                    f"{completed}/{total_jobs} "
                    f"images..."
                )


    except Exception as error:

        progress.empty()

        status.empty()


        st.error(
            "Error while reading flyers: "
            +
            str(error)
        )


        st.stop()


    # -------------------------------------
    # Compare
    # -------------------------------------

    status.info(
        "🧮 Comparing products..."
    )


    results = compare_all_offers(
        offers
    )


    progress.progress(
        1.0
    )


    progress.empty()

    status.empty()


    # =====================================
    # SUCCESS
    # =====================================

    st.success(
        "⚡ Comparison completed!"
    )


    # =====================================
    # SUMMARY
    # =====================================

    st.header(
        "📊 Summary"
    )


    columns = st.columns(
        min(
            len(offers),
            4
        )
    )


    for i, offer in enumerate(
        offers
    ):


        with columns[
            i
            %
            len(columns)
        ]:


            st.metric(
                offer[
                    "name"
                ],
                (
                    str(
                        len(
                            offer[
                                "products"
                            ]
                        )
                    )
                    +
                    " products"
                )
            )


    st.divider()


    # =====================================
    # COMPARISON
    # =====================================

    st.header(
        "🏆 Price Comparison"
    )


    if not results:

        st.warning(
            "No products were detected."
        )


    for result in results:


        with st.expander(
            "🛒 "
            +
            result[
                "name"
            ],
            expanded=True
        ):


            st.caption(
                "Found in "
                +
                str(
                    result[
                        "found_count"
                    ]
                )
                +
                " of "
                +
                str(
                    len(
                        offers
                    )
                )
                +
                " offers"
            )


            # ---------------------------------
            # Offers in rows of 3
            # ---------------------------------

            for start_index in range(
                0,
                len(offers),
                3
            ):


                row = offers[
                    start_index:
                    start_index + 3
                ]


                cols = st.columns(
                    len(
                        row
                    )
                )


                for local_index, offer in enumerate(
                    row
                ):


                    offer_index = (
                        start_index
                        +
                        local_index
                    )


                    with cols[
                        local_index
                    ]:


                        st.markdown(
                            "## "
                            +
                            offer[
                                "name"
                            ]
                        )


                        product = (
                            result[
                                "products"
                            ].get(
                                offer_index
                            )
                        )


                        if product is None:

                            st.error(
                                "❌ Not Found"
                            )


                        else:

                            price_data = (
                                result[
                                    "unit_prices"
                                ].get(
                                    offer_index
                                )
                            )


                            show_product(
                                product,
                                price_data
                            )


            # ---------------------------------
            # Winner
            # ---------------------------------

            winner = result[
                "winner_index"
            ]


            if (
                result[
                    "comparable"
                ]
                and winner
                is not None
            ):


                winner_offer = offers[
                    winner
                ]


                winner_price = result[
                    "unit_prices"
                ][
                    winner
                ]


                st.success(
                    "⭐ Best Value: "
                    +
                    winner_offer[
                        "name"
                    ]
                    +
                    " — "
                    +
                    unit_price_text(
                        winner_price
                    )
                )


            elif result[
                "found_count"
            ] == 1:


                only_offer_index = (
                    next(
                        iter(
                            result[
                                "products"
                            ]
                        )
                    )
                )


                st.info(
                    "ℹ️ Available only in "
                    +
                    offers[
                        only_offer_index
                    ][
                        "name"
                    ]
                )


            elif result[
                "found_count"
            ] > 1:


                st.warning(
                    "⚠️ Products found, "
                    "but their units cannot "
                    "be directly compared."
                )


    # =====================================
    # MISSING PRODUCTS
    # =====================================

    st.divider()


    st.header(
        "✨ Products Missing From Some Offers"
    )


    missing_results = [

        result

        for result
        in results

        if result[
            "found_count"
        ]
        <
        len(
            offers
        )
    ]


    if not missing_results:

        st.success(
            "No missing products."
        )


    for result in missing_results:


        found = []

        missing = []


        for i, offer in enumerate(
            offers
        ):


            if i in result[
                "products"
            ]:

                found.append(
                    offer[
                        "name"
                    ]
                )


            else:

                missing.append(
                    offer[
                        "name"
                    ]
                )


        with st.container(
            border=True
        ):


            st.markdown(
                "### "
                +
                result[
                    "name"
                ]
            )


            st.write(
                "✅ **Found:** "
                +
                ", ".join(
                    found
                )
            )


            st.write(
                "❌ **Not found:** "
                +
                ", ".join(
                    missing
                )
            )


    # =====================================
    # RAW PRODUCTS
    # =====================================

    st.divider()


    with st.expander(
        "📋 All Detected Products"
    ):


        for offer in offers:


            st.header(
                offer[
                    "name"
                ]
            )


            for product in offer[
                "products"
            ]:


                with st.container(
                    border=True
                ):


                    show_product(
                        product
                    )