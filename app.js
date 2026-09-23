import {
    AutoProcessor,
    AutoModelForVision2Seq,
    load_image
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";


/* ======================================== */
/* MODEL */
/* ======================================== */

const MODEL =
    "HuggingFaceTB/SmolVLM-256M-Instruct";


let processor = null;

let model = null;

let modelReady = false;


/* ======================================== */
/* ELEMENTS */
/* ======================================== */

const offerCount =
    document.getElementById(
        "offerCount"
    );


const offersContainer =
    document.getElementById(
        "offersContainer"
    );


const compareButton =
    document.getElementById(
        "compareButton"
    );


const status =
    document.getElementById(
        "status"
    );


const modelStatus =
    document.getElementById(
        "modelStatus"
    );


const modelBadge =
    document.getElementById(
        "modelBadge"
    );


const summarySection =
    document.getElementById(
        "summarySection"
    );


const summaryContent =
    document.getElementById(
        "summaryContent"
    );


const comparisonSection =
    document.getElementById(
        "comparisonSection"
    );


const comparisonContent =
    document.getElementById(
        "comparisonContent"
    );


const missingSection =
    document.getElementById(
        "missingSection"
    );


const missingContent =
    document.getElementById(
        "missingContent"
    );


const productsSection =
    document.getElementById(
        "productsSection"
    );


const productsContent =
    document.getElementById(
        "productsContent"
    );


/* ======================================== */
/* STATE */
/* ======================================== */

let offers = [];


/* ======================================== */
/* LOAD MODEL */
/* ======================================== */

async function loadModel() {

    try {

        modelStatus.textContent =
            "جاري تحميل معالج الصور...";


        modelBadge.textContent =
            "جاري التحميل";


        console.log(
            "Loading processor..."
        );


        processor =
            await AutoProcessor
                .from_pretrained(
                    MODEL
                );


        console.log(
            "Processor loaded ✓"
        );


        modelStatus.textContent =
            "جاري تحميل نموذج الذكاء الاصطناعي...";


        model =
            await AutoModelForVision2Seq
                .from_pretrained(
                    MODEL,
                    {
                        device: "webgpu",

                        dtype: {

                            embed_tokens:
                                "fp32",

                            vision_encoder:
                                "q4",

                            decoder_model_merged:
                                "q4"

                        }
                    }
                );


        console.log(
            "SmolVLM loaded ✓"
        );


        modelReady = true;


        modelStatus.textContent =
            "الذكاء الاصطناعي جاهز ✓";


        modelBadge.textContent =
            "جاهز";


        modelBadge.className =
            "badge ready";


        status.textContent =
            "الذكاء الاصطناعي جاهز ✓ ارفعي صور العروض.";


        updateCompareButton();


    } catch (error) {

        console.error(
            "Model loading error:",
            error
        );


        modelReady = false;


        modelStatus.textContent =
            "تعذر تحميل نموذج الذكاء الاصطناعي. استخدمي Chrome أو Edge حديثًا يدعم WebGPU.";


        modelBadge.textContent =
            "خطأ";


        modelBadge.className =
            "badge error";


        status.textContent =
            "فشل تحميل نموذج الذكاء الاصطناعي.";

    }

}


/* ======================================== */
/* CREATE OFFERS */
/* ======================================== */

function createOffers() {

    const count =
        Number(
            offerCount.value
        );


    offers = [];


    offersContainer.innerHTML =
        "";


    for (
        let index = 0;
        index < count;
        index++
    ) {

        const offer = {

            name:
                `العرض ${index + 1}`,

            files: [],

            products: []

        };


        offers.push(
            offer
        );


        const card =
            document.createElement(
                "section"
            );


        card.className =
            "card offer-card";


        card.innerHTML = `

            <div class="offer-number">
                العرض ${index + 1}
            </div>


            <label>
                اسم العرض
            </label>


            <input
                type="text"
                class="offer-name"
                value="العرض ${index + 1}"
                data-index="${index}"
            >


            <label
                class="upload-box"
                for="files-${index}"
            >

                <div class="upload-icon">
                    📷
                </div>


                <strong>
                    ارفع صور العرض
                </strong>


                <span>
                    يمكنك اختيار أكثر من صفحة
                    PNG أو JPG أو WEBP
                </span>

            </label>


            <input
                id="files-${index}"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                data-index="${index}"
            >


            <p
                id="count-${index}"
                class="file-count"
            >
                لم يتم اختيار صور
            </p>


            <div
                id="preview-${index}"
                class="preview-grid"
            ></div>

        `;


        offersContainer.appendChild(
            card
        );

    }


    addOfferEvents();

    updateCompareButton();

}


/* ======================================== */
/* OFFER EVENTS */
/* ======================================== */

function addOfferEvents() {

    const nameInputs =
        document.querySelectorAll(
            ".offer-name"
        );


    nameInputs.forEach(
        input => {

            input.addEventListener(
                "input",
                event => {

                    const index =
                        Number(
                            event.target
                                .dataset
                                .index
                        );


                    offers[index].name =
                        event.target
                            .value
                            .trim()
                        ||
                        `العرض ${index + 1}`;

                }
            );

        }
    );


    const fileInputs =
        offersContainer
            .querySelectorAll(
                'input[type="file"]'
            );


    fileInputs.forEach(
        input => {

            input.addEventListener(
                "change",
                event => {

                    const index =
                        Number(
                            event.target
                                .dataset
                                .index
                        );


                    const files =
                        Array.from(
                            event.target.files
                        );


                    offers[index].files =
                        files;


                    showPreviews(
                        index,
                        files
                    );


                    updateCompareButton();

                }
            );

        }
    );

}


/* ======================================== */
/* PREVIEW */
/* ======================================== */

function showPreviews(
    index,
    files
) {

    const preview =
        document.getElementById(
            `preview-${index}`
        );


    const counter =
        document.getElementById(
            `count-${index}`
        );


    preview.innerHTML =
        "";


    if (
        files.length === 0
    ) {

        counter.textContent =
            "لم يتم اختيار صور";

    } else if (
        files.length === 1
    ) {

        counter.textContent =
            "تم اختيار صورة واحدة";

    } else {

        counter.textContent =
            `تم اختيار ${files.length} صور`;

    }


    files.forEach(
        file => {

            const img =
                document.createElement(
                    "img"
                );


            const url =
                URL.createObjectURL(
                    file
                );


            img.src =
                url;


            img.alt =
                "معاينة صورة العرض";


            img.onload =
                () => {

                    URL.revokeObjectURL(
                        url
                    );

                };


            preview.appendChild(
                img
            );

        }
    );

}


/* ======================================== */
/* BUTTON */
/* ======================================== */

function updateCompareButton() {

    const allHaveFiles =
        offers.length > 0
        &&
        offers.every(
            offer =>
                offer.files.length > 0
        );


    compareButton.disabled =
        !modelReady
        ||
        !allHaveFiles;

}


/* ======================================== */
/* PROMPT */
/* ======================================== */

function buildPrompt() {

    return `
You are an expert supermarket flyer reader.

Carefully analyze the supermarket promotional flyer image.

Your job is to extract EVERY clearly visible product
that has a readable current promotional price.

Return ONLY a valid JSON array.

Do NOT use markdown.
Do NOT add explanations.
Do NOT add text before or after the JSON.

Use this exact structure:

[
  {
    "name": "Product name exactly as shown",
    "brand": "Brand name",
    "price": 45,
    "old_price": null,
    "quantity": 1,
    "unit": "L",
    "package_count": 1,
    "notes": ""
  }
]

IMPORTANT LANGUAGE RULES:

- Keep Arabic product names in Arabic.
- Keep English product names in English.
- Never translate brand names.
- If notes are required, write notes in Arabic.
- Do not translate the product name if it is written in English.

PRICE RULES:

- price = CURRENT promotional price.
- old_price = old crossed-out price.
- If old price is unavailable use null.
- Never guess an unreadable price.
- Do not confuse discount percentage with price.

QUANTITY RULES:

quantity = quantity of ONE package.

package_count = number of packages included
in the displayed price.

Examples:

Milk 1 L:
quantity = 1
unit = "L"
package_count = 1

Oil 1.5 L:
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

750g + 250g FREE:
quantity = 1000
unit = "g"
package_count = 1
notes = "750 جم + 250 جم مجانًا"

Buy 2 Get 1 Free:
quantity = 1
unit = "piece"
package_count = 3
notes = "اشترِ 2 واحصل على 1 مجانًا"

Allowed units:

kg
g
L
ml
piece
pack

If the product size cannot be determined:

quantity = 1
unit = "piece"
package_count = 1

Do NOT extract:

- headings
- category names
- store names
- supermarket names
- phone numbers
- addresses
- dates
- QR codes
- advertising slogans
- decorative text

Only return products with a clearly readable current price.

Return JSON only.
`;

}


/* ======================================== */
/* ANALYZE IMAGE */
/* ======================================== */

async function analyzeImage(
    file
) {

    const imageUrl =
        URL.createObjectURL(
            file
        );


    try {

        const image =
            await load_image(
                imageUrl
            );


        const prompt =
            buildPrompt();


        const messages = [

            {

                role: "user",

                content: [

                    {
                        type: "image"
                    },

                    {
                        type: "text",
                        text: prompt
                    }

                ]

            }

        ];


        const text =
            processor.apply_chat_template(
                messages,
                {
                    add_generation_prompt:
                        true
                }
            );


        const inputs =
            await processor(
                text,
                [image],
                {
                    do_image_splitting:
                        false
                }
            );


        const generatedIds =
            await model.generate(
                {

                    ...inputs,

                    /*
                    Smaller output improves
                    generation speed.
                    */

                    max_new_tokens:
                        500,

                    do_sample:
                        false

                }
            );


        const output =
            processor.batch_decode(
                generatedIds,
                {
                    skip_special_tokens:
                        true
                }
            );


        let result =
            output[0] || "";


        console.log(
            "Raw AI result:",
            result
        );


        result =
            extractJsonText(
                result
            );


        console.log(
            "JSON result:",
            result
        );


        const products =
            JSON.parse(
                result
            );


        if (
            !Array.isArray(
                products
            )
        ) {

            return [];

        }


        return products
            .map(
                cleanProduct
            )
            .filter(
                product =>
                    product !== null
            );


    } catch (error) {

        console.error(
            "Image analysis error:",
            error
        );


        return [];


    } finally {

        URL.revokeObjectURL(
            imageUrl
        );

    }

}


/* ======================================== */
/* JSON CLEANING */
/* ======================================== */

function extractJsonText(
    text
) {

    if (!text) {

        return "[]";

    }


    text =
        text
            .replace(
                /```json/gi,
                ""
            )

            .replace(
                /```/g,
                ""
            )

            .trim();


    /*
    SmolVLM may repeat part of
    the prompt before the answer.

    Therefore we search for JSON arrays
    and prefer the LAST valid-looking one.
    */

    const matches =
        text.match(
            /\[[\s\S]*?\]/g
        );


    if (
        matches
        &&
        matches.length
    ) {

        for (
            let i =
                matches.length - 1;

            i >= 0;

            i--
        ) {

            try {

                const parsed =
                    JSON.parse(
                        matches[i]
                    );


                if (
                    Array.isArray(
                        parsed
                    )
                ) {

                    return matches[i];

                }

            } catch (
                error
            ) {

                /*
                Try previous array.
                */

            }

        }

    }


    const firstBracket =
        text.indexOf(
            "["
        );


    const lastBracket =
        text.lastIndexOf(
            "]"
        );


    if (
        firstBracket !== -1
        &&
        lastBracket !== -1
        &&
        lastBracket >
            firstBracket
    ) {

        return text.slice(
            firstBracket,
            lastBracket + 1
        );

    }


    return "[]";

}


/* ======================================== */
/* NUMBER */
/* ======================================== */

function safeNumber(
    value,
    fallback = null
) {

    if (
        value === null
        ||
        value === undefined
        ||
        value === ""
    ) {

        return fallback;

    }


    const normalized =
        String(
            value
        )
            .replace(
                ",",
                "."
            )
            .trim();


    const number =
        Number(
            normalized
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return fallback;

    }


    return number;

}


/* ======================================== */
/* CLEAN PRODUCT */
/* ======================================== */

function cleanProduct(
    product
) {

    if (
        !product
        ||
        typeof product !==
            "object"
    ) {

        return null;

    }


    const name =
        String(
            product.name || ""
        ).trim();


    const price =
        safeNumber(
            product.price,
            null
        );


    if (
        !name
        ||
        price === null
        ||
        price <= 0
    ) {

        return null;

    }


    let quantity =
        safeNumber(
            product.quantity,
            1
        );


    if (
        quantity <= 0
    ) {

        quantity = 1;

    }


    let packageCount =
        safeNumber(
            product.package_count,
            1
        );


    if (
        packageCount <= 0
    ) {

        packageCount = 1;

    }


    packageCount =
        Math.round(
            packageCount
        );


    let unit =
        String(
            product.unit
            ||
            "piece"
        )
            .trim()
            .toLowerCase();


    const unitMap = {

        "l": "L",

        "liter": "L",

        "litre": "L",

        "liters": "L",

        "litres": "L",

        "لتر": "L",


        "ml": "ml",

        "milliliter": "ml",

        "milliliters": "ml",

        "مل": "ml",


        "kg": "kg",

        "kilogram": "kg",

        "kilograms": "kg",

        "كيلو": "kg",

        "كيلوجرام": "kg",


        "g": "g",

        "gram": "g",

        "grams": "g",

        "جرام": "g",

        "جم": "g",


        "piece": "piece",

        "pieces": "piece",

        "pc": "piece",

        "pcs": "piece",

        "قطعة": "piece",

        "قطعه": "piece",


        "pack": "pack",

        "packs": "pack",

        "عبوة": "pack",

        "عبوه": "pack"

    };


    unit =
        unitMap[
            unit
        ]
        ||
        "piece";


    const oldPrice =
        safeNumber(
            product.old_price,
            null
        );


    return {

        name,

        brand:
            String(
                product.brand
                ||
                ""
            ).trim(),

        price,

        old_price:
            oldPrice !== null
            &&
            oldPrice > 0
                ? oldPrice
                : null,

        quantity,

        unit,

        package_count:
            packageCount,

        notes:
            String(
                product.notes
                ||
                ""
            ).trim()

    };

}


/* ======================================== */
/* ANALYZE OFFER */
/* ======================================== */

async function analyzeOffer(
    offer
) {

    const allProducts =
        [];


    for (
        let pageIndex = 0;
        pageIndex <
            offer.files.length;
        pageIndex++
    ) {

        status.textContent =
            `🤖 جاري قراءة ${offer.name} — `
            +
            `الصورة ${pageIndex + 1} من `
            +
            `${offer.files.length}...`;


        const products =
            await analyzeImage(
                offer.files[
                    pageIndex
                ]
            );


        allProducts.push(
            ...products
        );

    }


    return removeDuplicates(
        allProducts
    );

}


/* ======================================== */
/* REMOVE DUPLICATES */
/* ======================================== */

function removeDuplicates(
    products
) {

    const seen =
        new Set();


    const result =
        [];


    for (
        const product
        of products
    ) {

        const key =
            [

                normalizeText(
                    product.name
                ),

                product.price,

                product.quantity,

                product.unit,

                product.package_count

            ].join(
                "|"
            );


        if (
            seen.has(
                key
            )
        ) {

            continue;

        }


        seen.add(
            key
        );


        result.push(
            product
        );

    }


    return result;

}


/* ======================================== */
/* NORMALIZE ARABIC */
/* ======================================== */

function normalizeText(
    text
) {

    return String(
        text || ""
    )

        .toLowerCase()

        .replace(
            /[أإآ]/g,
            "ا"
        )

        .replace(
            /ة/g,
            "ه"
        )

        .replace(
            /ى/g,
            "ي"
        )

        .replace(
            /ؤ/g,
            "و"
        )

        .replace(
            /ئ/g,
            "ي"
        )

        .replace(
            /[\u064B-\u065F\u0670]/g,
            ""
        )

        .replace(
            /[^\w\u0600-\u06FF\s]/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


/* ======================================== */
/* WORDS */
/* ======================================== */

function getWords(
    text
) {

    return new Set(

        normalizeText(
            text
        )

            .split(
                " "
            )

            .filter(
                Boolean
            )

    );

}


/* ======================================== */
/* SIMILARITY */
/* ======================================== */

function similarity(
    productA,
    productB
) {

    const nameA =
        normalizeText(
            productA.name
        );


    const nameB =
        normalizeText(
            productB.name
        );


    if (
        !nameA
        ||
        !nameB
    ) {

        return 0;

    }


    if (
        nameA === nameB
    ) {

        return 100;

    }


    const wordsA =
        getWords(
            nameA
        );


    const wordsB =
        getWords(
            nameB
        );


    const intersection =
        [
            ...wordsA
        ].filter(
            word =>
                wordsB.has(
                    word
                )
        );


    const union =
        new Set(
            [
                ...wordsA,
                ...wordsB
            ]
        );


    let score =
        union.size
            ?
            (
                intersection.length
                /
                union.size
            )
            *
            100
            :
            0;


    if (
        nameA.includes(
            nameB
        )
        ||
        nameB.includes(
            nameA
        )
    ) {

        score =
            Math.max(
                score,
                80
            );

    }


    const brandA =
        normalizeText(
            productA.brand
        );


    const brandB =
        normalizeText(
            productB.brand
        );


    if (
        brandA
        &&
        brandB
        &&
        brandA === brandB
    ) {

        score =
            Math.min(
                100,
                score + 10
            );

    }


    return score;

}


/* ======================================== */
/* GROUP PRODUCTS */
/* ======================================== */

function groupProducts() {

    const groups =
        [];


    const threshold =
        55;


    offers.forEach(
        (
            offer,
            offerIndex
        ) => {

            offer.products.forEach(
                product => {

                    let bestGroup =
                        null;


                    let bestScore =
                        0;


                    groups.forEach(
                        group => {

                            if (
                                group.products[
                                    offerIndex
                                ]
                            ) {

                                return;

                            }


                            Object
                                .values(
                                    group.products
                                )
                                .forEach(
                                    existing => {

                                        const score =
                                            similarity(
                                                product,
                                                existing
                                            );


                                        if (
                                            score >
                                            bestScore
                                        ) {

                                            bestScore =
                                                score;

                                            bestGroup =
                                                group;

                                        }

                                    }
                                );

                        }
                    );


                    if (
                        bestGroup
                        &&
                        bestScore >=
                            threshold
                    ) {

                        bestGroup
                            .products[
                                offerIndex
                            ] =
                                product;

                    } else {

                        groups.push(
                            {

                                name:
                                    product.name,

                                products: {

                                    [offerIndex]:
                                        product

                                }

                            }
                        );

                    }

                }
            );

        }
    );


    return groups;

}


/* ======================================== */
/* UNIT PRICE */
/* ======================================== */

function getUnitPrice(
    product
) {

    const total =
        product.quantity
        *
        product.package_count;


    let baseQuantity =
        total;


    let baseUnit =
        product.unit;


    if (
        product.unit ===
        "kg"
    ) {

        baseQuantity =
            total * 1000;


        baseUnit =
            "g";

    }


    if (
        product.unit ===
        "L"
    ) {

        baseQuantity =
            total * 1000;


        baseUnit =
            "ml";

    }


    if (
        baseQuantity <= 0
    ) {

        return null;

    }


    return {

        value:
            product.price
            /
            baseQuantity,

        unit:
            baseUnit

    };

}


/* ======================================== */
/* BUILD COMPARISON */
/* ======================================== */

function buildComparison() {

    const groups =
        groupProducts();


    return groups.map(
        group => {

            const unitPrices =
                {};


            Object.entries(
                group.products
            ).forEach(
                (
                    [
                        offerIndex,
                        product
                    ]
                ) => {

                    unitPrices[
                        offerIndex
                    ] =
                        getUnitPrice(
                            product
                        );

                }
            );


            const entries =
                Object.entries(
                    unitPrices
                );


            let comparable =
                false;


            let winnerIndices =
                [];


            if (
                entries.length >= 2
            ) {

                const units =
                    new Set(
                        entries.map(
                            (
                                [, data]
                            ) =>
                                data.unit
                        )
                    );


                if (
                    units.size === 1
                ) {

                    comparable =
                        true;


                    const bestValue =
                        Math.min(
                            ...entries.map(
                                (
                                    [, data]
                                ) =>
                                    data.value
                            )
                        );


                    const tolerance =
                        0.000001;


                    winnerIndices =
                        entries

                            .filter(
                                (
                                    [, data]
                                ) =>
                                    Math.abs(
                                        data.value
                                        -
                                        bestValue
                                    )
                                    <=
                                    tolerance
                            )

                            .map(
                                (
                                    [index]
                                ) =>
                                    Number(
                                        index
                                    )
                            );

                }

            }


            return {

                ...group,

                unitPrices,

                comparable,

                winnerIndices,

                foundCount:
                    Object.keys(
                        group.products
                    ).length

            };

        }
    );

}


/* ======================================== */
/* UNIT PRICE TEXT */
/* ======================================== */

function unitPriceText(
    data
) {

    if (!data) {

        return "غير معروف";

    }


    if (
        data.unit ===
        "g"
    ) {

        return (
            (
                data.value
                *
                1000
            ).toFixed(
                2
            )
            +
            " جنيه / كجم"
        );

    }


    if (
        data.unit ===
        "ml"
    ) {

        return (
            (
                data.value
                *
                1000
            ).toFixed(
                2
            )
            +
            " جنيه / لتر"
        );

    }


    if (
        data.unit ===
        "piece"
    ) {

        return (
            data.value
                .toFixed(
                    2
                )
            +
            " جنيه / قطعة"
        );

    }


    if (
        data.unit ===
        "pack"
    ) {

        return (
            data.value
                .toFixed(
                    2
                )
            +
            " جنيه / عبوة"
        );

    }


    return (
        data.value
            .toFixed(
                2
            )
        +
        ` جنيه / ${data.unit}`
    );

}


/* ======================================== */
/* UNIT ARABIC */
/* ======================================== */

function arabicUnit(
    unit
) {

    const units = {

        "kg": "كجم",

        "g": "جم",

        "L": "لتر",

        "ml": "مل",

        "piece": "قطعة",

        "pack": "عبوة"

    };


    return units[unit]
        ||
        unit;

}


/* ======================================== */
/* PACKAGE TEXT */
/* ======================================== */

function packageText(
    product
) {

    const unit =
        arabicUnit(
            product.unit
        );


    if (
        product.package_count >
        1
    ) {

        return (
            `${product.package_count}`
            +
            " × "
            +
            `${formatNumber(
                product.quantity
            )} `
            +
            unit
        );

    }


    return (
        `${formatNumber(
            product.quantity
        )} `
        +
        unit
    );

}


/* ======================================== */
/* FORMAT NUMBER */
/* ======================================== */

function formatNumber(
    value
) {

    const number =
        Number(
            value
        );


    if (
        Number.isInteger(
            number
        )
    ) {

        return String(
            number
        );

    }


    return String(
        number
    );

}


/* ======================================== */
/* ESCAPE HTML */
/* ======================================== */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ======================================== */
/* PRODUCT HTML */
/* ======================================== */

function productHtml(
    product,
    unitData
) {

    if (!product) {

        return `
            <p class="not-found">
                ❌ غير موجود
            </p>
        `;

    }


    const brand =
        product.brand
            ?
            `
                <p>
                    🏷️ الماركة:
                    ${escapeHtml(
                        product.brand
                    )}
                </p>
            `
            :
            "";


    const oldPrice =
        product.old_price
            ?
            `
                <p>
                    🏷️ السعر القديم:
                    ${formatNumber(
                        product.old_price
                    )}
                    جنيه
                </p>
            `
            :
            "";


    const unitPrice =
        unitData
            ?
            `
                <p>
                    📊 سعر الوحدة:
                    <strong>
                        ${unitPriceText(
                            unitData
                        )}
                    </strong>
                </p>
            `
            :
            "";


    const notes =
        product.notes
            ?
            `
                <p>
                    ℹ️
                    ${escapeHtml(
                        product.notes
                    )}
                </p>
            `
            :
            "";


    return `

        <strong class="product-name">
            ${escapeHtml(
                product.name
            )}
        </strong>


        ${brand}


        <p>
            💰 السعر:
            <strong>
                ${formatNumber(
                    product.price
                )}
                جنيه
            </strong>
        </p>


        <p>
            📦 الحجم:
            ${escapeHtml(
                packageText(
                    product
                )
            )}
        </p>


        ${unitPrice}


        ${oldPrice}


        ${notes}

    `;

}


/* ======================================== */
/* SUMMARY */
/* ======================================== */

function displaySummary() {

    summaryContent.innerHTML =
        "";


    offers.forEach(
        offer => {

            const box =
                document.createElement(
                    "div"
                );


            box.className =
                "summary-box";


            box.innerHTML = `

                <strong>
                    ${escapeHtml(
                        offer.name
                    )}
                </strong>


                <div class="summary-number">
                    ${offer.products.length}
                </div>


                <span>
                    منتج مكتشف
                </span>

            `;


            summaryContent.appendChild(
                box
            );

        }
    );


    summarySection
        .classList
        .remove(
            "hidden"
        );

}


/* ======================================== */
/* COMPARISON */
/* ======================================== */

function displayComparison(
    results
) {

    comparisonContent.innerHTML =
        "";


    if (
        results.length === 0
    ) {

        comparisonContent.innerHTML =
            `
                <div class="missing-item">
                    لم يتم اكتشاف منتجات واضحة.
                    جرّبي استخدام صور أوضح.
                </div>
            `;


        comparisonSection
            .classList
            .remove(
                "hidden"
            );


        return;

    }


    results.forEach(
        result => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "comparison-item";


            let offersHtml =
                "";


            offers.forEach(
                (
                    offer,
                    index
                ) => {

                    const product =
                        result.products[
                            index
                        ];


                    const unitData =
                        result.unitPrices[
                            index
                        ];


                    offersHtml += `

                        <div class="product-box">

                            <h4>
                                ${escapeHtml(
                                    offer.name
                                )}
                            </h4>


                            ${productHtml(
                                product,
                                unitData
                            )}

                        </div>

                    `;

                }
            );


            let resultHtml =
                "";


            if (
                result.comparable
                &&
                result.winnerIndices.length
                    === 1
            ) {

                const winner =
                    result.winnerIndices[
                        0
                    ];


                resultHtml = `

                    <div class="best-value">

                        ⭐ أفضل قيمة:

                        <strong>
                            ${escapeHtml(
                                offers[
                                    winner
                                ].name
                            )}
                        </strong>

                        —

                        ${unitPriceText(
                            result.unitPrices[
                                winner
                            ]
                        )}

                    </div>

                `;

            }


            else if (
                result.comparable
                &&
                result.winnerIndices.length
                    > 1
            ) {

                const names =
                    result.winnerIndices
                        .map(
                            index =>
                                offers[
                                    index
                                ].name
                        )
                        .join(
                            "، "
                        );


                const first =
                    result.winnerIndices[
                        0
                    ];


                resultHtml = `

                    <div class="best-value">

                        ⭐ نفس أفضل قيمة في:

                        <strong>
                            ${escapeHtml(
                                names
                            )}
                        </strong>

                        —

                        ${unitPriceText(
                            result.unitPrices[
                                first
                            ]
                        )}

                    </div>

                `;

            }


            else if (
                result.foundCount ===
                1
            ) {

                const onlyIndex =
                    Number(
                        Object.keys(
                            result.products
                        )[0]
                    );


                resultHtml = `

                    <div class="compare-warning">

                        ℹ️ المنتج موجود فقط في
                        ${escapeHtml(
                            offers[
                                onlyIndex
                            ].name
                        )}

                    </div>

                `;

            }


            else {

                resultHtml = `

                    <div class="compare-warning">

                        ⚠️ تم العثور على المنتج
                        في أكثر من عرض، لكن لا يمكن
                        مقارنة الوحدات مباشرة.

                    </div>

                `;

            }


            item.innerHTML = `

                <div class="comparison-title">
                    ${escapeHtml(
                        result.name
                    )}
                </div>


                <div class="found-count">

                    موجود في
                    ${result.foundCount}
                    من
                    ${offers.length}
                    عروض

                </div>


                <div class="offer-comparison-grid">

                    ${offersHtml}

                </div>


                ${resultHtml}

            `;


            comparisonContent
                .appendChild(
                    item
                );

        }
    );


    comparisonSection
        .classList
        .remove(
            "hidden"
        );

}


/* ======================================== */
/* MISSING */
/* ======================================== */

function displayMissing(
    results
) {

    missingContent.innerHTML =
        "";


    const missing =
        results.filter(
            result =>
                result.foundCount <
                offers.length
        );


    if (
        missing.length === 0
    ) {

        missingContent.innerHTML = `

            <div class="missing-item">

                ✅ كل المنتجات المتطابقة
                موجودة في جميع العروض.

            </div>

        `;

    }


    missing.forEach(
        result => {

            const found =
                [];


            const notFound =
                [];


            offers.forEach(
                (
                    offer,
                    index
                ) => {

                    if (
                        result.products[
                            index
                        ]
                    ) {

                        found.push(
                            offer.name
                        );

                    } else {

                        notFound.push(
                            offer.name
                        );

                    }

                }
            );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "missing-item";


            item.innerHTML = `

                <strong>
                    ${escapeHtml(
                        result.name
                    )}
                </strong>


                <p>
                    ✅ موجود في:
                    ${escapeHtml(
                        found.join(
                            "، "
                        )
                    )}
                </p>


                <p>
                    ❌ غير موجود في:
                    ${escapeHtml(
                        notFound.join(
                            "، "
                        )
                    )}
                </p>

            `;


            missingContent
                .appendChild(
                    item
                );

        }
    );


    missingSection
        .classList
        .remove(
            "hidden"
        );

}


/* ======================================== */
/* ALL PRODUCTS */
/* ======================================== */

function displayAllProducts() {

    productsContent.innerHTML =
        "";


    offers.forEach(
        offer => {

            const section =
                document.createElement(
                    "div"
                );


            section.className =
                "products-offer";


            let productsHtml =
                "";


            offer.products.forEach(
                product => {

                    productsHtml += `

                        <div class="product-box">

                            ${productHtml(
                                product,
                                null
                            )}

                        </div>

                    `;

                }
            );


            if (
                !productsHtml
            ) {

                productsHtml = `

                    <div class="product-box">

                        لم يتم اكتشاف منتجات
                        في هذا العرض.

                    </div>

                `;

            }


            section.innerHTML = `

                <h3>
                    ${escapeHtml(
                        offer.name
                    )}
                </h3>


                <div class="product-list">

                    ${productsHtml}

                </div>

            `;


            productsContent
                .appendChild(
                    section
                );

        }
    );


    productsSection
        .classList
        .remove(
            "hidden"
        );

}


/* ======================================== */
/* HIDE RESULTS */
/* ======================================== */

function hideResults() {

    summarySection
        .classList
        .add(
            "hidden"
        );


    comparisonSection
        .classList
        .add(
            "hidden"
        );


    missingSection
        .classList
        .add(
            "hidden"
        );


    productsSection
        .classList
        .add(
            "hidden"
        );

}


/* ======================================== */
/* MAIN COMPARE */
/* ======================================== */

async function compareOffers() {

    if (
        !modelReady
    ) {

        status.textContent =
            "الذكاء الاصطناعي لم يجهز بعد.";

        return;

    }


    if (
        offers.some(
            offer =>
                offer.files.length ===
                    0
        )
    ) {

        status.textContent =
            "⚠️ ارفعي صورة واحدة على الأقل لكل عرض.";

        return;

    }


    compareButton.disabled =
        true;


    hideResults();


    try {

        for (
            let index = 0;
            index < offers.length;
            index++
        ) {

            const offer =
                offers[
                    index
                ];


            status.textContent =
                `🤖 جاري تحليل ${offer.name}...`;


            offer.products =
                await analyzeOffer(
                    offer
                );


            console.log(
                offer.name,
                offer.products
            );

        }


        status.textContent =
            "🧮 جاري مقارنة الأسعار والكميات...";


        const results =
            buildComparison();


        displaySummary();


        displayComparison(
            results
        );


        displayMissing(
            results
        );


        displayAllProducts();


        status.textContent =
            "✅ تمت المقارنة بنجاح";


        comparisonSection
            .scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "start"
                }
            );


    } catch (error) {

        console.error(
            "Comparison error:",
            error
        );


        status.textContent =
            "❌ حدث خطأ أثناء تحليل الصور. جرّبي صورًا أوضح أو عددًا أقل من الصور.";

    }


    updateCompareButton();

}


/* ======================================== */
/* EVENTS */
/* ======================================== */

offerCount.addEventListener(
    "change",
    createOffers
);


compareButton.addEventListener(
    "click",
    compareOffers
);


/* ======================================== */
/* START */
/* ======================================== */

createOffers();

loadModel();
