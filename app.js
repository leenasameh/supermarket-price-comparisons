const imagesInput =
    document.getElementById("imagesInput");

const previewContainer =
    document.getElementById("previewContainer");

const analyzeButton =
    document.getElementById("analyzeButton");

const loadingSection =
    document.getElementById("loadingSection");

const resultsSection =
    document.getElementById("resultsSection");

const loadingText =
    document.getElementById("loadingText");

const progressBar =
    document.getElementById("progressBar");

const progressText =
    document.getElementById("progressText");


let selectedFiles = [];
let magazineImages = [];
let allProducts = [];


/* =====================================
   اختيار الصور
===================================== */

imagesInput.addEventListener(
    "change",
    function(event) {

        selectedFiles =
            Array.from(event.target.files);

        magazineImages = [];

        renderPreviews();

        analyzeButton.disabled =
            selectedFiles.length < 1;
    }
);


/* =====================================
   معاينة المجلات
===================================== */

function renderPreviews() {

    previewContainer.innerHTML = "";

    selectedFiles.forEach(
        (file,index) => {

            const reader =
                new FileReader();

            reader.onload =
                function(e) {

                    magazineImages[index] =
                        e.target.result;

                    const card =
                        document.createElement("div");

                    card.className =
                        "preview-card";

                    card.innerHTML = `

                        <img
                            src="${e.target.result}"
                            alt="مجلة ${index + 1}"
                        >

                        <div class="preview-content">

                            <strong>
                                مجلة ${index + 1}
                            </strong>

                            <span>
                                ${escapeHTML(file.name)}
                            </span>

                            <br>

                            <a
                                class="open-image"
                                href="${e.target.result}"
                                target="_blank"
                            >
                                🔍 فتح صورة المجلة
                            </a>

                        </div>
                    `;

                    previewContainer
                        .appendChild(card);
                };

            reader.readAsDataURL(file);
        }
    );
}


/* =====================================
   بدء التحليل
===================================== */

analyzeButton.addEventListener(
    "click",
    analyzeOffers
);


async function analyzeOffers() {

    if(selectedFiles.length === 0)
        return;


    allProducts = [];

    loadingSection
        .classList
        .remove("hidden");

    resultsSection
        .classList
        .add("hidden");

    analyzeButton.disabled = true;


    updateProgress(
        1,
        "جاري تحميل نموذج قراءة الصور..."
    );


    try {

        for(
            let i = 0;
            i < selectedFiles.length;
            i++
        ) {

            const file =
                selectedFiles[i];

            const magazine =
                `مجلة ${i + 1}`;


            loadingText.innerText =
                `جاري قراءة ${magazine}...`;


            /*
             * Tesseract OCR
             * Arabic + English
             */

            const result =
                await Tesseract.recognize(

                    file,

                    "ara+eng",

                    {
                        logger:
                            message => {

                                if(
                                    message.status ===
                                    "recognizing text"
                                ) {

                                    const local =
                                        message.progress || 0;

                                    const overall =
                                        (
                                            i + local
                                        )
                                        /
                                        selectedFiles.length;

                                    updateProgress(

                                        Math.round(
                                            overall * 90
                                        ),

                                        `الذكاء الاصطناعي يقرأ ${magazine}...`
                                    );
                                }
                            }
                    }
                );


            console.log(
                magazine,
                result.data.text
            );


            const products =
                extractProductsFromText(
                    result.data.text,
                    magazine,
                    i
                );


            allProducts.push(
                ...products
            );
        }


        updateProgress(
            93,
            "جاري مطابقة المنتجات..."
        );


        await sleep(300);


        updateProgress(
            97,
            "جاري حساب السعر بالنسبة للكمية..."
        );


        await sleep(300);


        renderResults();


        updateProgress(
            100,
            "تم الانتهاء"
        );


        await sleep(350);


        loadingSection
            .classList
            .add("hidden");

        resultsSection
            .classList
            .remove("hidden");


        resultsSection
            .scrollIntoView({
                behavior: "smooth"
            });

    }

    catch(error) {

        console.error(error);

        alert(
            "حدث خطأ أثناء قراءة الصور.\n" +
            "تأكدي من اتصال الإنترنت " +
            "وجربي صور أوضح."
        );

    }

    finally {

        analyzeButton.disabled = false;
    }
}


/* =====================================
   استخراج المنتجات من النص
===================================== */

function extractProductsFromText(
    text,
    magazine,
    magazineIndex
) {

    const products = [];


    const lines =
        text
        .split(/\n/)
        .map(cleanOCRLine)
        .filter(
            line =>
                line.length > 1
        );


    console.log(
        "السطور:",
        lines
    );


    /*
     * نبحث عن سطر فيه سعر
     * ثم نبحث حوله عن:
     *
     * اسم المنتج
     * الحجم
     */

    for(
        let i = 0;
        i < lines.length;
        i++
    ) {

        const price =
            findPrice(lines[i]);


        if(price === null)
            continue;


        /*
         * ناخد عدة أسطر حول السعر
         */

        const start =
            Math.max(
                0,
                i - 4
            );

        const end =
            Math.min(
                lines.length,
                i + 3
            );


        const nearby =
            lines.slice(
                start,
                end
            );


        let quantity = null;


        /*
         * البحث عن الحجم
         */

        for(const line of nearby) {

            const detected =
                findQuantity(line);

            if(detected) {

                quantity =
                    detected;

                break;
            }
        }


        /*
         * البحث عن اسم المنتج
         */

        const nameLines = [];


        for(
            let j = i - 1;
            j >= start;
            j--
        ) {

            const line =
                lines[j];


            if(
                isPossibleProductName(
                    line
                )
            ) {

                nameLines.unshift(
                    cleanProductName(line)
                );


                /*
                 * نسمح بسطرين للاسم
                 * عشان الاسم الكامل ممكن يكون
                 * مقسوم في OCR
                 */

                if(
                    nameLines.length >= 2
                ) {
                    break;
                }
            }
        }


        let productName =
            nameLines
            .join(" ")
            .trim();


        /*
         * لو الاسم مش واضح
         */

        if(
            !productName ||
            productName.length < 2
        ) {

            productName =
                "منتج غير معروف";
        }


        /*
         * لو مفيش حجم
         */

        if(!quantity) {

            quantity = {

                value: 1,

                unit: "item",

                display: "1 قطعة",

                detected: false
            };
        }


        const normalized =
            normalizeQuantity(
                quantity.value,
                quantity.unit
            );


        products.push({

            id:
                `${magazineIndex}-${i}-${Date.now()}`,

            name:
                productName,

            normalizedName:
                normalizeProductName(
                    productName
                ),

            magazine:
                magazine,

            magazineIndex:
                magazineIndex,

            image:
                magazineImages[
                    magazineIndex
                ] || "",

            price:
                price,

            quantity:
                quantity.value,

            originalUnit:
                quantity.unit,

            size:
                quantity.display,

            quantityDetected:
                quantity.detected,

            baseQuantity:
                normalized.value,

            baseUnit:
                normalized.unit,

            unitPrice:
                calculateUnitPrice(
                    price,
                    normalized.value
                )
        });
    }


    return removeDuplicates(
        products
    );
}


/* =====================================
   هل السطر ممكن يكون اسم منتج؟
===================================== */

function isPossibleProductName(line) {

    if(!line)
        return false;


    if(line.length < 2)
        return false;


    if(findPrice(line) !== null)
        return false;


    if(findQuantity(line))
        return false;


    /*
     * لازم يحتوي على حروف
     */

    if(
        !/[\p{L}]/u.test(line)
    ) {
        return false;
    }


    /*
     * كلمات غالبًا ليست أسماء منتجات
     */

    const banned = [

        "عرض",
        "خصم",
        "وفر",
        "السعر",
        "جنيه",
        "egp",
        "offer",
        "discount",
        "save"
    ];


    const lower =
        line.toLowerCase();


    if(
        banned.some(
            word =>
                lower === word
        )
    ) {
        return false;
    }


    return true;
}


/* =====================================
   استخراج السعر
===================================== */

function findPrice(text) {

    if(!text)
        return null;


    text =
        convertArabicNumbers(
            text
        );


    const patterns = [

        /(\d+(?:[.,]\d{1,2})?)\s*(?:جنيه|جنيهًا|جنيها|egp|l\.?e\.?)/i,

        /(?:egp|l\.?e\.?)\s*(\d+(?:[.,]\d{1,2})?)/i,

        /(?:جنيه|جنيها)\s*(\d+(?:[.,]\d{1,2})?)/i
    ];


    for(const pattern of patterns) {

        const match =
            text.match(pattern);


        if(match) {

            const value =
                parseFloat(
                    match[1]
                    .replace(",", ".")
                );


            if(
                value > 0 &&
                value < 100000
            ) {

                return value;
            }
        }
    }


    /*
     * لو السطر عبارة عن رقم سعر فقط
     */

    const onlyNumber =
        text.match(
            /^\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*$/
        );


    if(onlyNumber) {

        const value =
            parseFloat(
                onlyNumber[1]
                .replace(",", ".")
            );


        if(
            value >= 2 &&
            value < 100000
        ) {

            return value;
        }
    }


    return null;
}


/* =====================================
   استخراج الحجم
===================================== */

function findQuantity(text) {

    if(!text)
        return null;


    let clean =
        convertArabicNumbers(text)
        .toLowerCase()
        .replace(",", ".");


    let match;


    /* KG */

    match =
        clean.match(
            /(\d+(?:\.\d+)?)\s*(?:kg|kgs|كيلو(?:جرام)?|كجم)/
        );


    if(match) {

        return {

            value:
                parseFloat(
                    match[1]
                ),

            unit:
                "kg",

            display:
                `${match[1]} كجم`,

            detected:
                true
        };
    }


    /* GRAM */

    match =
        clean.match(
            /(\d+(?:\.\d+)?)\s*(?:g|gm|gram|grams|جرام|جم)/
        );


    if(match) {

        return {

            value:
                parseFloat(
                    match[1]
                ),

            unit:
                "g",

            display:
                `${match[1]} جم`,

            detected:
                true
        };
    }


    /* LITER */

    match =
        clean.match(
            /(\d+(?:\.\d+)?)\s*(?:liter|litre|liters|litres|ltr|لتر|ل)/
        );


    if(match) {

        return {

            value:
                parseFloat(
                    match[1]
                ),

            unit:
                "l",

            display:
                `${match[1]} لتر`,

            detected:
                true
        };
    }


    /* ML */

    match =
        clean.match(
            /(\d+(?:\.\d+)?)\s*(?:ml|milliliter|مل)/
        );


    if(match) {

        return {

            value:
                parseFloat(
                    match[1]
                ),

            unit:
                "ml",

            display:
                `${match[1]} مل`,

            detected:
                true
        };
    }


    /* PIECES */

    match =
        clean.match(
            /(\d+)\s*(?:pcs|pieces|piece|قطع|قطعة|حبة|حبات)/
        );


    if(match) {

        return {

            value:
                parseFloat(
                    match[1]
                ),

            unit:
                "item",

            display:
                `${match[1]} قطعة`,

            detected:
                true
        };
    }


    /* PACK */

    match =
        clean.match(
            /(\d+)\s*(?:pack|packs|عبوة|عبوات)/
        );


    if(match) {

        return {

            value:
                parseFloat(
                    match[1]
                ),

            unit:
                "item",

            display:
                `${match[1]} عبوة`,

            detected:
                true
        };
    }


    return null;
}


/* =====================================
   توحيد الوحدات
===================================== */

function normalizeQuantity(
    value,
    unit
) {

    switch(unit) {

        case "g":

            return {
                value:
                    value / 1000,

                unit:
                    "kg"
            };


        case "kg":

            return {
                value:
                    value,

                unit:
                    "kg"
            };


        case "ml":

            return {
                value:
                    value / 1000,

                unit:
                    "l"
            };


        case "l":

            return {
                value:
                    value,

                unit:
                    "l"
            };


        default:

            return {
                value:
                    value,

                unit:
                    "item"
            };
    }
}


/* =====================================
   حساب السعر لكل وحدة
===================================== */

function calculateUnitPrice(
    price,
    quantity
) {

    if(
        !quantity ||
        quantity <= 0
    ) {

        return price;
    }


    return (
        price /
        quantity
    );
}


/* =====================================
   تنظيف اسم المنتج
===================================== */

function cleanProductName(name) {

    return name

        .replace(
            /\s+/g,
            " "
        )

        .replace(
            /^[\-–—:|]+/,
            ""
        )

        .replace(
            /[\-–—:|]+$/,
            ""
        )

        .trim();
}


/* =====================================
   Normalize name للمقارنة
===================================== */

function normalizeProductName(name) {

    return name

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
            /[^\p{L}\p{N}\s]/gu,
            " "
        )

        .replace(
            /\b\d+(?:\.\d+)?\b/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();
}


/* =====================================
   تشابه الأسماء
===================================== */

function similarity(a,b) {

    if(!a || !b)
        return 0;


    if(a === b)
        return 1;


    /*
     * لو اسم داخل الاسم الآخر
     */

    if(
        a.includes(b) ||
        b.includes(a)
    ) {

        const min =
            Math.min(
                a.length,
                b.length
            );

        const max =
            Math.max(
                a.length,
                b.length
            );


        if(
            min / max > .55
        ) {

            return .85;
        }
    }


    const wordsA =
        new Set(
            a
            .split(" ")
            .filter(
                word =>
                    word.length > 1
            )
        );


    const wordsB =
        new Set(
            b
            .split(" ")
            .filter(
                word =>
                    word.length > 1
            )
        );


    if(
        wordsA.size === 0 ||
        wordsB.size === 0
    ) {

        return 0;
    }


    const intersection =
        [...wordsA]
        .filter(
            word =>
                wordsB.has(word)
        );


    const union =
        new Set([
            ...wordsA,
            ...wordsB
        ]);


    return (
        intersection.length /
        union.size
    );
}


/* =====================================
   حذف التكرار
===================================== */

function removeDuplicates(products) {

    const result = [];


    for(const product of products) {

        const exists =
            result.some(item => {

                const nameScore =
                    similarity(
                        item.normalizedName,
                        product.normalizedName
                    );


                return (

                    nameScore > .8

                    &&

                    Math.abs(
                        item.price -
                        product.price
                    ) < .01

                    &&

                    item.magazine ===
                    product.magazine
                );
            });


        if(!exists) {

            result.push(
                product
            );
        }
    }


    return result;
}


/* =====================================
   تجميع المنتجات المتشابهة
===================================== */

function groupProducts() {

    const groups = [];


    for(const product of allProducts) {

        let bestGroup = null;

        let bestScore = 0;


        for(const group of groups) {

            const reference =
                group[0];


            /*
             * مينفعش نقارن كيلو بلتر
             */

            if(
                reference.baseUnit !==
                product.baseUnit
            ) {

                continue;
            }


            const score =
                similarity(
                    reference.normalizedName,
                    product.normalizedName
                );


            if(
                score > bestScore
            ) {

                bestScore =
                    score;

                bestGroup =
                    group;
            }
        }


        /*
         * Threshold المطابقة
         */

        if(
            bestGroup &&
            bestScore >= .42
        ) {

            bestGroup.push(
                product
            );

        }

        else {

            groups.push([
                product
            ]);
        }
    }


    return groups;
}


/* =====================================
   عرض النتائج
===================================== */

function renderResults() {

    const groups =
        groupProducts();


    /*
     * منتج موجود في أكتر من مجلة
     */

    const comparisonGroups =
        groups.filter(
            group => {

                const magazines =
                    new Set(
                        group.map(
                            p =>
                                p.magazine
                        )
                    );


                return (
                    magazines.size >= 2
                );
            }
        );


    /*
     * منتج موجود في مجلة واحدة
     */

    const uniqueGroups =
        groups.filter(
            group => {

                const magazines =
                    new Set(
                        group.map(
                            p =>
                                p.magazine
                        )
                    );


                return (
                    magazines.size === 1
                );
            }
        );


    document.getElementById(
        "offersCount"
    ).innerText =
        selectedFiles.length;


    document.getElementById(
        "productsCount"
    ).innerText =
        allProducts.length;


    document.getElementById(
        "comparedCount"
    ).innerText =
        comparisonGroups.length;


    renderComparisons(
        comparisonGroups
    );


    renderUniqueProducts(
        uniqueGroups
    );


    renderAllProducts();
}


/* =====================================
   عرض المقارنات
===================================== */

function renderComparisons(groups) {

    const container =
        document.getElementById(
            "comparisonContainer"
        );


    container.innerHTML = "";


    if(groups.length === 0) {

        container.innerHTML = `

            <div class="empty">

                لم يتم العثور على منتجات
                متشابهة بين المجلات.

            </div>
        `;

        return;
    }


    groups.forEach(
        (group,index) => {

            /*
             * الأفضل حسب سعر الوحدة
             */

            group.sort(
                (a,b) =>
                    a.unitPrice -
                    b.unitPrice
            );


            const best =
                group[0];


            let offersHTML = "";


            group.forEach(
                (product,i) => {

                    let savingHTML = "";


                    if(
                        i > 0 &&
                        product.unitPrice >
                        best.unitPrice
                    ) {

                        const difference =
                            product.unitPrice -
                            best.unitPrice;


                        savingHTML = `

                            <div class="saving">

                                اختيار العرض الأفضل يوفر

                                ${formatPrice(
                                    difference
                                )}

                                جنيه لكل

                                ${displayUnit(
                                    best.baseUnit
                                )}

                            </div>
                        `;
                    }


                    offersHTML += `

                        <div class="
                            offer-card
                            ${i === 0 ? "best" : ""}
                        ">

                            ${
                                i === 0
                                ?
                                `
                                <span class="best-badge">
                                    🏆 الأوفر
                                </span>
                                `
                                :
                                ""
                            }


                            <div class="offer-name">
                                ${escapeHTML(product.magazine)}
                            </div>


                            <div class="product-full-name">

                                ${escapeHTML(product.name)}

                            </div>


                            <div class="price">

                                ${formatPrice(product.price)}
                                جنيه

                            </div>


                            <div class="size">

                                📦 الحجم / الكمية:

                                <strong>
                                    ${escapeHTML(product.size)}
                                </strong>

                            </div>


                            <div class="unit-price">

                                ${
                                    product.quantityDetected
                                    ?
                                    `
                                    ${formatPrice(product.unitPrice)}
                                    جنيه /
                                    ${displayUnit(product.baseUnit)}
                                    `
                                    :
                                    "لم يتم اكتشاف الحجم"
                                }

                            </div>


                            ${savingHTML}

                        </div>
                    `;
                }
            );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "comparison-card";


            card.innerHTML = `

                <div class="comparison-top">

                    <small>
                        مقارنة رقم ${index + 1}
                    </small>

                    <h2>
                        ${escapeHTML(best.name)}
                    </h2>

                </div>


                <div class="offers-grid">

                    ${offersHTML}

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );
}


/* =====================================
   المنتجات غير المقارنة
===================================== */

function renderUniqueProducts(groups) {

    const container =
        document.getElementById(
            "uniqueProducts"
        );


    container.innerHTML = "";


    const products =
        groups.flat();


    if(products.length === 0) {

        container.innerHTML = `

            <div class="empty">

                لا توجد منتجات منفردة.
                جميع المنتجات المكتشفة
                تم العثور على مقابل لها.

            </div>
        `;

        return;
    }


    products.forEach(
        product => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "unique-product";


            card.innerHTML = `

                <div>

                    <h3>
                        ${escapeHTML(product.name)}
                    </h3>


                    <div class="unique-info">

                        <span>
                            📦 الحجم:
                            <strong>
                                ${escapeHTML(product.size)}
                            </strong>
                        </span>


                        <span>
                            💰 السعر:
                            <strong>
                                ${formatPrice(product.price)}
                                جنيه
                            </strong>
                        </span>


                        ${
                            product.quantityDetected
                            ?
                            `
                            <span>

                                ⚖️ سعر الوحدة:

                                <strong>

                                    ${formatPrice(
                                        product.unitPrice
                                    )}

                                    جنيه /

                                    ${displayUnit(
                                        product.baseUnit
                                    )}

                                </strong>

                            </span>
                            `
                            :
                            ""
                        }

                    </div>

                </div>


                <span class="magazine-label">

                    موجود في
                    ${escapeHTML(product.magazine)}
                    فقط

                </span>
            `;


            container.appendChild(
                card
            );
        }
    );
}


/* =====================================
   كل المنتجات
===================================== */

function renderAllProducts() {

    const container =
        document.getElementById(
            "allProducts"
        );


    container.innerHTML = "";


    if(allProducts.length === 0) {

        container.innerHTML = `

            <div class="empty">

                لم يتم اكتشاف أي منتجات.

                <br><br>

                جربي صورة أوضح للمجلة.

            </div>
        `;

        return;
    }


    allProducts.forEach(
        (product,index) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            card.innerHTML = `

                <small>

                    منتج ${index + 1}

                    • ${escapeHTML(product.magazine)}

                </small>


                <h3>

                    ${escapeHTML(product.name)}

                </h3>


                <div class="product-row">

                    <span>
                        المجلة
                    </span>

                    <strong>
                        ${escapeHTML(product.magazine)}
                    </strong>

                </div>


                <div class="product-row">

                    <span>
                        الحجم
                    </span>

                    <strong>
                        ${escapeHTML(product.size)}
                    </strong>

                </div>


                <div class="product-row">

                    <span>
                        السعر
                    </span>

                    <strong>

                        ${formatPrice(product.price)}
                        جنيه

                    </strong>

                </div>


                ${
                    product.quantityDetected
                    ?
                    `
                    <div class="product-row">

                        <span>
                            سعر الوحدة
                        </span>

                        <strong>

                            ${formatPrice(
                                product.unitPrice
                            )}

                            جنيه /

                            ${displayUnit(
                                product.baseUnit
                            )}

                        </strong>

                    </div>
                    `
                    :
                    ""
                }
            `;


            container.appendChild(
                card
            );
        }
    );
}


/* =====================================
   تحويل الأرقام العربية
===================================== */

function convertArabicNumbers(text) {

    const arabic =
        "٠١٢٣٤٥٦٧٨٩";

    const persian =
        "۰۱۲۳۴۵۶۷۸۹";


    return text

        .replace(
            /[٠-٩]/g,
            d =>
                arabic.indexOf(d)
        )

        .replace(
            /[۰-۹]/g,
            d =>
                persian.indexOf(d)
        );
}


/* =====================================
   تنظيف OCR
===================================== */

function cleanOCRLine(line) {

    return convertArabicNumbers(
        line
    )

    .replace(
        /\s+/g,
        " "
    )

    .replace(
        /[|]+/g,
        " "
    )

    .trim();
}


/* =====================================
   اسم الوحدة
===================================== */

function displayUnit(unit) {

    if(unit === "kg")
        return "كجم";


    if(unit === "l")
        return "لتر";


    return "قطعة";
}


/* =====================================
   تنسيق السعر
===================================== */

function formatPrice(value) {

    if(
        value === null ||
        value === undefined ||
        Number.isNaN(value)
    ) {

        return "-";
    }


    return Number(value)
        .toFixed(2)
        .replace(
            /\.00$/,
            ""
        );
}


/* =====================================
   حماية HTML
===================================== */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/* =====================================
   PROGRESS
===================================== */

function updateProgress(
    value,
    message
) {

    value =
        Math.min(
            100,
            Math.max(
                0,
                value
            )
        );


    progressBar.style.width =
        `${value}%`;


    progressText.innerText =
        `${value}%`;


    loadingText.innerText =
        message;
}


/* =====================================
   RESET
===================================== */

function resetApp() {

    selectedFiles = [];

    magazineImages = [];

    allProducts = [];


    imagesInput.value = "";


    previewContainer.innerHTML = "";


    resultsSection
        .classList
        .add("hidden");


    loadingSection
        .classList
        .add("hidden");


    analyzeButton.disabled =
        true;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =====================================
   SLEEP
===================================== */

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}
