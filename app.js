import {
    AutoProcessor,
    AutoModelForVision2Seq,
    load_image
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";


/* =========================================================
   SETTINGS
========================================================= */

const MODEL =
    "HuggingFaceTB/SmolVLM-256M-Instruct";

/*
    تصغير الصور الكبيرة يسرّع التحليل.
    1280 مناسب بين السرعة ووضوح الأسعار.
*/
const MAX_IMAGE_SIZE = 1280;

/*
    تقليل عدد الكلمات التي يولدها الموديل
    يسرّع النتيجة.
*/
const MAX_NEW_TOKENS = 350;


/* =========================================================
   MODEL STATE
========================================================= */

let processor = null;
let model = null;
let modelReady = false;


/* =========================================================
   CACHE
========================================================= */

const analysisCache =
    new Map();


/* =========================================================
   ELEMENTS
========================================================= */

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


/* =========================================================
   OFFERS STATE
========================================================= */

let offers = [];


/* =========================================================
   LOAD MODEL
========================================================= */

async function loadModel() {

    try {

        modelReady = false;

        compareButton.disabled =
            true;

        modelStatus.textContent =
            "جاري تحميل معالج الصور...";

        modelBadge.textContent =
            "جاري التحميل";

        modelBadge.className =
            "badge loading";

        status.textContent =
            "⏳ جاري تجهيز الذكاء الاصطناعي...";


        console.log(
            "Loading processor..."
        );


        processor =
            await AutoProcessor.from_pretrained(
                MODEL
            );


        console.log(
            "Processor loaded ✓"
        );


        modelStatus.textContent =
            "جاري تحميل نموذج الذكاء الاصطناعي...";


        /*
            نفس إعدادات التحميل التي كانت
            تعمل عندك قبل تعديل السرعة.
        */

        model =
            await AutoModelForVision2Seq.from_pretrained(
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


        modelReady = true;


        console.log(
            "SmolVLM ready ✓"
        );


        modelStatus.textContent =
            "الذكاء الاصطناعي جاهز ✓";

        modelBadge.textContent =
            "جاهز";

        modelBadge.className =
            "badge ready";

        status.textContent =
            "✅ الذكاء الاصطناعي جاهز. ارفعي صور العروض.";


        updateCompareButton();


    } catch (error) {

        console.error(
            "Model loading error:",
            error
        );


        modelReady = false;


        modelStatus.textContent =
            "تعذر تحميل نموذج الذكاء الاصطناعي.";

        modelBadge.textContent =
            "خطأ";

        modelBadge.className =
            "badge error";


        status.textContent =
            "❌ حدث خطأ أثناء تحميل الذكاء الاصطناعي. افتحي Console لمعرفة الخطأ.";


        compareButton.disabled =
            true;

    }

}


/* =========================================================
   CREATE OFFERS
========================================================= */

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
                    ارفعي صور العرض
                </strong>


                <span>
                    يمكنك اختيار أكثر من صورة
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


/* =========================================================
   OFFER EVENTS
========================================================= */

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

                    offers[index].products =
                        [];


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


/* =========================================================
   IMAGE PREVIEWS
========================================================= */

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

    }

    else if (
        files.length === 1
    ) {

        counter.textContent =
            "تم اختيار صورة واحدة";

    }

    else {

        counter.textContent =
            `تم اختيار ${files.length} صور`;

    }


    files.forEach(
        file => {

            const image =
                document.createElement(
                    "img"
                );


            const url =
                URL.createObjectURL(
                    file
                );


            image.src =
                url;


            image.alt =
                "معاينة صورة العرض";


            image.onload =
                () => {

                    URL.revokeObjectURL(
                        url
                    );

                };


            preview.appendChild(
                image
            );

        }
    );

}


/* =========================================================
   BUTTON STATE
========================================================= */

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


/* =========================================================
   FILE CACHE KEY
========================================================= */

function getFileKey(
    file
) {

    return [

        file.name,

        file.size,

        file.lastModified

    ].join(
        "|"
    );

}


/* =========================================================
   RESIZE IMAGE
========================================================= */

async function resizeImage(
    file
) {

    /*
        لو المتصفح لا يدعم createImageBitmap
        نستخدم الصورة الأصلية.
    */

    if (
        !window.createImageBitmap
    ) {

        return file;

    }


    const bitmap =
        await createImageBitmap(
            file
        );


    const originalWidth =
        bitmap.width;

    const originalHeight =
        bitmap.height;


    if (
        originalWidth <=
            MAX_IMAGE_SIZE
        &&
        originalHeight <=
            MAX_IMAGE_SIZE
    ) {

        bitmap.close();

        return file;

    }


    const scale =
        Math.min(

            MAX_IMAGE_SIZE
            /
            originalWidth,

            MAX_IMAGE_SIZE
            /
            originalHeight

        );


    const width =
        Math.round(
            originalWidth
            *
            scale
        );


    const height =
        Math.round(
            originalHeight
            *
            scale
        );


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        width;

    canvas.height =
        height;


    const context =
        canvas.getContext(
            "2d",
            {
                alpha: false
            }
        );


    context.drawImage(

        bitmap,

        0,
        0,

        width,
        height

    );


    bitmap.close();


    const blob =
        await new Promise(
            resolve => {

                canvas.toBlob(

                    resolve,

                    "image/jpeg",

                    0.9

                );

            }
        );


    return blob || file;

}


/* =========================================================
   AI PROMPT
========================================================= */

function buildPrompt() {

    return `
You are an expert supermarket promotional flyer reader.

Carefully analyze this flyer image.

Extract every clearly visible product that has
a readable CURRENT promotional price.

Return ONLY a valid JSON array.

Do not use markdown.
Do not write explanations.
Do not write anything before or after the JSON.

Use this structure:

[
  {
    "name": "product name",
    "brand": "brand name",
    "price": 45,
    "old_price": null,
    "quantity": 1,
    "unit": "L",
    "package_count": 1,
    "notes": ""
  }
]

LANGUAGE RULES:

- Keep Arabic product names in Arabic.
- Keep English product names in English.
- Never translate brand names.
- Write notes in Arabic when needed.

PRICE RULES:

- price = CURRENT promotional price.
- old_price = old crossed-out price.
- If there is no old price use null.
- Never guess unreadable prices.
- Do not confuse discount percentage with price.

QUANTITY RULES:

quantity = quantity in ONE package.

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

If product size cannot be determined:

quantity = 1
unit = "piece"
package_count = 1

Do NOT extract:

- store names
- supermarket names
- headings
- category names
- dates
- phone numbers
- addresses
- QR codes
- slogans
- decorative text

Only include products with a clearly readable
current promotional price.

Return JSON only.
`;

}


/* =========================================================
   ANALYZE IMAGE
========================================================= */

async function analyzeImage(
    file
) {

    const cacheKey =
        getFileKey(
            file
        );


    /*
        لو الصورة اتحللت قبل كده
        نرجع النتيجة فورًا.
    */

    if (
        analysisCache.has(
            cacheKey
        )
    ) {

        console.log(
            "Using cache:",
            file.name
        );


        status.textContent =
            "⚡ تم استخدام تحليل محفوظ للصورة.";


        return structuredClone(
            analysisCache.get(
                cacheKey
            )
        );

    }


    let imageUrl =
        null;


    try {

        status.textContent =
            "⚡ جاري تجهيز الصورة للتحليل...";


        /*
            تصغير الصورة الكبيرة.
        */

        const optimizedFile =
            await resizeImage(
                file
            );


        imageUrl =
            URL.createObjectURL(
                optimizedFile
            );


        const image =
            await load_image(
                imageUrl
            );


        const messages = [

            {

                role: "user",

                content: [

                    {
                        type: "image"
                    },

                    {
                        type: "text",
                        text:
                            buildPrompt()
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


        status.textContent =
            "🤖 جاري قراءة المنتجات والأسعار...";


        const generatedIds =
            await model.generate(
                {

                    ...inputs,

                    max_new_tokens:
                        MAX_NEW_TOKENS,

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


        const rawResult =
            output[0]
            ||
            "";


        console.log(
            "Raw AI result:",
            rawResult
        );


        const jsonText =
            extractJsonText(
                rawResult
            );


        console.log(
            "Extracted JSON:",
            jsonText
        );


        let products =
            [];


        try {

            products =
                JSON.parse(
                    jsonText
                );

        } catch (error) {

            console.warn(
                "JSON parsing failed:",
                error
            );


            products =
                [];

        }


        if (
            !Array.isArray(
                products
            )
        ) {

            products =
                [];

        }


        products =
            products

                .map(
                    cleanProduct
                )

                .filter(
                    Boolean
                );


        /*
            حفظ النتيجة.
        */

        analysisCache.set(

            cacheKey,

            structuredClone(
                products
            )

        );


        return products;


    } catch (error) {

        console.error(
            "Image analysis error:",
            error
        );


        return [];


    } finally {

        if (
            imageUrl
        ) {

            URL.revokeObjectURL(
                imageUrl
            );

        }

    }

}


/* =========================================================
   EXTRACT JSON
========================================================= */

function extractJsonText(
    text
) {

    if (!text) {

        return "[]";

    }


    let cleaned =
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


    const firstBracket =
        cleaned.indexOf(
            "["
        );


    const lastBracket =
        cleaned.lastIndexOf(
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

        return cleaned.slice(

            firstBracket,

            lastBracket + 1

        );

    }


    return "[]";

}


/* =========================================================
   SAFE NUMBER
========================================================= */

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


/* =========================================================
   CLEAN PRODUCT
========================================================= */

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
            product.name
            ||
            ""
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

                ?

                oldPrice

                :

                null,

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


/* =========================================================
   ANALYZE OFFER
========================================================= */

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
            `🤖 جاري تحليل ${offer.name} — الصورة `
            +
            `${pageIndex + 1} من ${offer.files.length}...`;


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


/* =========================================================
   REMOVE DUPLICATES
========================================================= */

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


/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalizeText(
    text
) {

    return String(
        text
        ||
        ""
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


/* =========================================================
   WORDS
========================================================= */

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


/* =========================================================
   SIMILARITY
========================================================= */

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


/* =========================================================
   GROUP PRODUCTS
========================================================= */

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

                    }

                    else {

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


/* =========================================================
   UNIT PRICE
========================================================= */

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
            total
            *
            1000;


        baseUnit =
            "g";

    }


    if (
        product.unit ===
        "L"
    ) {

        baseQuantity =
            total
            *
            1000;


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


/* =========================================================
   BUILD COMPARISON
========================================================= */

function buildComparison() {

    const groups =
        groupProducts();


    return groups.map(
        group => {

            const unitPrices =
                {};


            Object
                .entries(
                    group.products
                )
                .forEach(
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
                entries.length >=
                2
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
                    units.size ===
                    1
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
                                    <
                                    0.000001
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


/* =========================================================
   UNIT PRICE TEXT
========================================================= */

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


/* =========================================================
   ARABIC UNIT
========================================================= */

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


    return units[
        unit
    ]
    ||
    unit;

}


/* =========================================================
   PACKAGE TEXT
========================================================= */

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

            `${product.package_count} × `

            +

            `${formatNumber(
                product.quantity
            )} ${unit}`

        );

    }


    return (

        `${formatNumber(
            product.quantity
        )} ${unit}`

    );

}


/* =========================================================
   FORMAT NUMBER
========================================================= */

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


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value
        ??
        ""
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


/* =========================================================
   PRODUCT HTML
========================================================= */

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


/* =========================================================
   SUMMARY
========================================================= */

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


/* =========================================================
   DISPLAY COMPARISON
========================================================= */

function displayComparison(
    results
) {

    comparisonContent.innerHTML =
        "";


    if (
        results.length ===
        0
    ) {

        comparisonContent.innerHTML = `

            <div class="missing-item">

                لم يتم اكتشاف منتجات واضحة.

                جرّبي صورة أوضح أو أقرب
                للمنتجات والأسعار.

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
                result.winnerIndices.length ===
                    1
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
                result.winnerIndices.length >
                    1
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


/* =========================================================
   DISPLAY MISSING
========================================================= */

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
        missing.length ===
        0
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

                    }

                    else {

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


/* =========================================================
   ALL PRODUCTS
========================================================= */

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


/* =========================================================
   HIDE RESULTS
========================================================= */

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


/* =========================================================
   MAIN COMPARE
========================================================= */

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


    const startTime =
        performance.now();


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


        const seconds =
            (
                (
                    performance.now()
                    -
                    startTime
                )
                /
                1000
            ).toFixed(
                1
            );


        status.textContent =
            `✅ تمت المقارنة بنجاح خلال ${seconds} ثانية`;


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
            "❌ حدث خطأ أثناء تحليل الصور.";

    }


    updateCompareButton();

}


/* =========================================================
   EVENTS
========================================================= */

offerCount.addEventListener(
    "change",
    createOffers
);


compareButton.addEventListener(
    "click",
    compareOffers
);


/* =========================================================
   START
========================================================= */

createOffers();

loadModel();
