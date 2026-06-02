let pdfGenerating = false;
let savedRange = null; 
let isTableMode = false; 

const TARGET_PAGE_HEIGHT_MM = 262; 

// ==========================================
//   Python 自動排考卷腳本內嵌前端邏輯核心
// ==========================================
const TEMPLATE_BASE_URL = "https://nokin.vercel.app/mainjs/mainhtml/auto";
const TEMPLATE_MAP = {
    4:  "02", 5:  "03", 6:  "03", 7:  "05", 8:  "04",
    9:  "05", 10: "05", 11: "11", 12: "06", 15: "06",
    18: "09", 22: "11"
};
const DEFAULT_TEMPLATE_CODE = "09";

function getTemplateCode(qCount) {
    return TEMPLATE_MAP[qCount] || DEFAULT_TEMPLATE_CODE;
}

async function fetchTemplate(templateCode) {
    const url = `${TEMPLATE_BASE_URL}/${templateCode}.html`;
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`無法下載遠端工作紙模板: ${url}`);
    }
    return await resp.text();
}

function parseJsInfo(jsText) {
    const titleMatch = jsText.match(/const\s+baseTitle\s*=\s*["']([^"']+)["'];/);
    if (!titleMatch) return null; 

    const baseTitle = titleMatch[1].trim();

    const dateMatch = jsText.match(/const\s+dateStr\s*=\s*["']([^"']*)["'];/);
    let ymd = "";
    if (dateMatch && dateMatch[1].trim()) {
        const dateStr = dateMatch[1].trim();
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            ymd = parts[0] + parts[1].padStart(2, '0') + parts[2].padStart(2, '0');
        }
    }

    const qCount = (jsText.match(/\{\s*q\s*:/g) || []).length;

    return { baseTitle, ymd, qCount, cleanJs: jsText.trim() };
}

function triggerDownload(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

document.getElementById('generateSystemBtn').addEventListener('click', async () => {
    let rawInput = document.getElementById('lessonHtmlInput').value.trim();
    if (!rawInput) { alert("請先輸入或貼入教案內容代碼或工作紙 JS 程式！"); return; }

    try {
        const jsInfo = parseJsInfo(rawInput);
        if (jsInfo) {
            const { baseTitle, ymd, qCount, cleanJs } = jsInfo;
            const templateCode = getTemplateCode(qCount);
            
            const loading = document.createElement('div');
            loading.textContent = `偵測到工作紙程式碼！正在遠端下載模板 ${templateCode}.html (${qCount}題)...`;
            loading.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(30,70,110,0.95); color:white; padding:20px 30px; border-radius:10px; z-index:10000; font-weight:bold;';
            document.body.appendChild(loading);

            try {
                let htmlTemplate = await fetchTemplate(templateCode);

                if (!htmlTemplate.includes("**********")) {
                    throw new Error("遠端模板中找不到 ********** 標記，請檢查模板設定");
                }

                let newHtml = htmlTemplate.replace("**********", cleanJs);

                const pageTitle = ymd ? `${baseTitle}_${ymd}` : baseTitle;
                newHtml = newHtml.replace(/<title>.*?<\/title>/gi, `<title>${pageTitle}</title>`);

                let safeTitle = baseTitle.replace(/[^\w\u4e00-\u9fff-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                const filename = ymd ? `${safeTitle}_${ymd}.html` : `${safeTitle}.html`;

                triggerDownload(filename, newHtml);
                alert(`工作紙 HTML 生成成功並已自動啟動下載！\n檔案名稱：${filename}`);
            } catch (err) {
                alert("工作紙自動生成失敗：" + err.message);
            } finally {
                document.body.removeChild(loading);
            }
            return; 
        }
    } catch (e) {
        console.error("嘗試解析為工作紙時出錯，切換回常規教案解析模式", e);
    }

    const container = document.getElementById('lessonPages');
    container.innerHTML = '';
    document.getElementById('imageGallery').innerHTML = ''; 

    if (rawInput.includes('lesson-row')) {
        isTableMode = true;
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawInput, 'text/html');
        doc.querySelectorAll('.lesson-row').forEach(row => container.appendChild(row.cloneNode(true)));
        container.querySelectorAll('.row-content').forEach(cell => cell.setAttribute('contenteditable', 'true'));
    } else {
        isTableMode = false;
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawInput, 'text/html');
        
        doc.querySelectorAll('table td').forEach(td => {
            td.setAttribute('contenteditable', 'true');
        });
        
        const wrapperEditor = document.createElement('div');
        wrapperEditor.className = 'free-content-editor';
        wrapperEditor.setAttribute('contenteditable', 'true');
        wrapperEditor.innerHTML = doc.body.innerHTML;
        container.appendChild(wrapperEditor);
    }

    wrapNativeImagesWithEditorShell(container);
    document.getElementById('inputPanel').style.display = 'none';
    document.body.classList.remove('input-mode-active'); 
    document.getElementById('systemButtonBar').style.display = 'flex';
    container.style.display = 'flex';

    document.getElementById('heightSlider').value = 45;
    document.getElementById('heightValue').textContent = "45px";

    bindDynamicEvents();
    await rerenderMath(container);
    setTimeout(refreshPageBreakLines, 600);
});

// ==========================================
//            其餘原教案系統邏輯
// ==========================================
function refreshPageBreakLines() {
    const container = document.getElementById('lessonPages');
    if (!container || container.style.display === 'none') return;
    container.querySelectorAll('.pdf-page-break-line').forEach(line => line.remove());

    const mmToPx = 3.77952;
    const pageHeightPx = TARGET_PAGE_HEIGHT_MM * mmToPx; 
    const containerPaddingTopPx = 20 * mmToPx; 
    const totalHeightPx = container.scrollHeight;
    const pageCount = Math.ceil(totalHeightPx / pageHeightPx);
    
    for (let i = 1; i <= pageCount; i++) {
        const line = document.createElement('div');
        line.className = 'pdf-page-break-line';
        line.style.top = (i * pageHeightPx + containerPaddingTopPx - 20) + 'px';
        line.innerHTML = `▲ 第 ${i} 頁 A4 裁剪邊界線（下方內容將切至下一頁）▲`;
        container.appendChild(line);
    }
}

function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = document.getElementById('lessonPages');
        if (container.contains(range.commonAncestorContainer)) {
            savedRange = range.cloneRange();
        }
    }
}

function addImageToGallery(src) {
    if (!src) return;
    const gallery = document.getElementById('imageGallery');
    
    const existingThumbs = gallery.querySelectorAll('img');
    for (let thumb of existingThumbs) {
        if (thumb.src === src) return; 
    }

    const thumbImg = document.createElement('img');
    thumbImg.className = 'gallery-thumb';
    thumbImg.src = src;
    thumbImg.title = '點擊即可在目前游標處直接重用此圖';
    
    thumbImg.addEventListener('click', () => {
        insertImageToEditor(src);
    });
    
    gallery.appendChild(thumbImg);
}

function insertImageToEditor(src) {
    const wrapper = document.createElement('div');
    wrapper.className = 'resizable-img-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.draggable = true;
    wrapper.style.width = '350px';
    
    const img = document.createElement('img');
    img.src = src;
    wrapper.appendChild(img);
    initResizableImage(wrapper);

    const container = document.getElementById('lessonPages');
    let targetCell = null;
    if (savedRange && container.contains(savedRange.commonAncestorContainer)) {
        let node = savedRange.commonAncestorContainer;
        while (node && node !== container) {
            if (node.nodeType === Node.ELEMENT_NODE && (node.classList.contains('row-content') || node.tagName.toLowerCase() === 'td')) {
                targetCell = node;
                break;
            }
            node = node.parentNode;
        }
    }
    if (!targetCell) {
        targetCell = document.activeElement && (document.activeElement.classList.contains('row-content') || document.activeElement.tagName.toLowerCase() === 'td')
                     ? document.activeElement 
                     : container.querySelector('.row-content, td[contenteditable="true"]');
    }
    
    if (targetCell) {
        insertAtSavedCursor(wrapper, targetCell);
    } else {
        const editor = container.querySelector('.free-content-editor') || container;
        insertAtSavedCursor(wrapper, editor);
    }

    refreshPageBreakLines();
}

function insertAtSavedCursor(element, fallbackContainer) {
    if (savedRange && fallbackContainer.contains(savedRange.commonAncestorContainer)) {
        try {
            savedRange.deleteContents();
            savedRange.insertNode(element);
            savedRange.setStartAfter(element);
            savedRange.setEndAfter(element);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
            return;
        } catch (e) {
            console.warn("游標插入不成功，改用追加模式插入", e);
        }
    }
    fallbackContainer.appendChild(element);
}

function isEmptyNode(node) {
    if (!node) return true;
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.replace(/[\s\u00a0\n\r]/g, '') === '';
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (tagName === 'br') return true;
        if (node.querySelectorAll('img, mjx-container, canvas, svg').length > 0) return false;
        return node.textContent.replace(/[\s\u00a0\n\r]/g, '') === '';
    }
    return false;
}

function isNodeDeText(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    let txt = node.textContent.trim();
    return txt === '解：' || txt === '解' || txt.startsWith('解：');
}

function isNodeQuestion(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    let txt = node.textContent.trim();
    return /^\d+[\s\.\、\)]/.test(txt) || txt.includes('題目') || txt.includes('題：');
}

function sanitizeMathJaxHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const innerEditor = doc.querySelector('.free-content-editor');
    let targetDoc = doc;
    if (innerEditor) {
        const tempDoc = parser.parseFromString(innerEditor.innerHTML, 'text/html');
        targetDoc = tempDoc;
    }

    const containers = targetDoc.querySelectorAll('mjx-container, .MathJax, script[id*="MathJax"]');
    containers.forEach(container => {
        let formula = "";
        const mml = container.querySelector('mjx-assistive-mml math, math');
        if (mml) {
            const altText = mml.getAttribute('alttext');
            if (altText) { formula = altText; } else {
                const ann = mml.querySelector('annotation');
                if (ann) { formula = ann.textContent; }
            }
        }
        if (!formula) { formula = container.textContent.trim(); } else {
            formula = formula.replace(/\n/g, ' ').trim();
            if (!formula.startsWith('$')) { formula = '$' + formula + '$'; }
        }
        if (container.parentNode) {
            const textNode = targetDoc.createTextNode(formula);
            container.parentNode.replaceChild(textNode, container);
        }
    });
    return targetDoc.body ? targetDoc.body.innerHTML.trim() : targetDoc.documentElement.innerHTML.trim();
}

function wrapNativeImagesWithEditorShell(container) {
    container.querySelectorAll('img').forEach(img => {
        addImageToGallery(img.src);

        if (img.parentNode && img.parentNode.classList.contains('resizable-img-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'resizable-img-wrapper';
        wrapper.contentEditable = 'false';
        wrapper.draggable = true;
        wrapper.style.width = img.style.width || img.getAttribute('width') || '350px';
        const newImg = img.cloneNode(true);
        newImg.style.width = '100%';
        wrapper.appendChild(newImg);
        if (img.parentNode) {
            img.parentNode.replaceChild(wrapper, img);
            initResizableImage(wrapper);
        }
    });
}

document.getElementById('heightSlider').addEventListener('input', function() {
    const val = this.value + 'px';
    document.getElementById('heightValue').textContent = val;
    const targets = document.querySelectorAll('#lessonPages .row-content, #lessonPages table td');
    targets.forEach(el => {
        el.style.minHeight = val;
        if(el.tagName.toLowerCase() === 'td') { el.style.height = val; }
    });
    refreshPageBreakLines();
});

document.getElementById('insertImageBtn').addEventListener('click', () => {
    document.getElementById('imageFileInput').click();
});

document.getElementById('imageFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64Url = evt.target.result;
        insertImageToEditor(base64Url); 
        addImageToGallery(base64Url);   
    };
    reader.readAsDataURL(file);
    this.value = ''; 
});

document.getElementById('resetSystemBtn').addEventListener('click', () => {
    if (confirm("確定要退回輸入框狀態嗎？您的修改將會遺失。")) {
        document.getElementById('inputPanel').style.display = 'block';
        document.body.classList.add('input-mode-active');
        document.getElementById('systemButtonBar').style.display = 'none';
        document.getElementById('lessonPages').style.display = 'none';
    }
});

async function rerenderMath(targetContainer) {
    if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
        try { await MathJax.typesetPromise([targetContainer]); } catch (err) { console.warn(err); }
    }
}

function downloadTxtBackup(fileName, containerClone) {
    let txtContent = sanitizeMathJaxHTML(containerClone.innerHTML);
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName.replace('.pdf', '.txt'); 
    link.style.display = 'none';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

async function exportMultiPagePDF() {
    if (pdfGenerating) return;
    pdfGenerating = true;
    const container = document.getElementById('lessonPages');

    let finalFileName = "";
    
    // 優先嘗試尋找容器內的第一個 <h2> 標籤內容作為檔名
    const h2Element = container.querySelector('h2');
    if (h2Element && h2Element.textContent.trim()) {
        const safeH2Title = h2Element.textContent.trim().replace(/[\\\/:*?"<>|]/g, "_");
        finalFileName = `${safeH2Title}.pdf`;
    } else {
        // 如果找不到 <h2>，則降級使用原本的「班級_課題_老師_日期」邏輯
        let nameParts = [];
        const fullTextContext = container.textContent;
        const gradeMatch = fullTextContext.match(/(?:班級|年級)[:：]\s*([^\s\n<]+)/);
        const subjectMatch = fullTextContext.match(/(?:課題|科目)[:：]\s*([^\s\n<]+)/); 
        const teacherMatch = fullTextContext.match(/(?:執教|老師|教師)[:：]\s*([^\s\n<]+)/);

        if (gradeMatch) nameParts.push(gradeMatch[1].trim());
        if (subjectMatch) nameParts.push(subjectMatch[1].trim());
        if (teacherMatch) nameParts.push(teacherMatch[1].trim());

        const now = new Date();
        const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        finalFileName = nameParts.length > 0 ? `${nameParts.join('_')}_${formattedDate}.pdf` : `${formattedDate}.pdf`;
    }

    downloadTxtBackup(finalFileName, container.cloneNode(true));

    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = '正在進行精準防孤行分頁排版中...';
    loadingDiv.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.85); color:white; padding:16px 28px; border-radius:32px; z-index:10000; font-weight:bold;';
    document.body.appendChild(loadingDiv);

    try {
        const sandbox = document.getElementById('pdfSandbox');
        sandbox.innerHTML = '';
        const mmToPx = 3.77952;
        const maxPageHeightPx = Math.floor(TARGET_PAGE_HEIGHT_MM * mmToPx); 

        let pagePagesNode = [];
        let currentPageNode = document.createElement('div');
        currentPageNode.className = 'pdf-sandbox-page';
        sandbox.appendChild(currentPageNode);
        pagePagesNode.push(currentPageNode);

        if (isTableMode) {
            const rows = container.querySelectorAll('.lesson-row');
            for (let i = 0; i < rows.length; i++) {
                const originalRow = rows[i];
                if (originalRow.querySelector('.row-header')) {
                    currentPageNode.appendChild(originalRow.cloneNode(true));
                    continue;
                }
                const labelText = originalRow.querySelector('.row-label').innerHTML;
                const contentCell = originalRow.querySelector('.row-content');
                
                let currentRowClone = document.createElement('div');
                currentRowClone.className = 'lesson-row';
                currentRowClone.innerHTML = `<div class="row-label">${labelText}</div><div class="row-content"></div>`;
                currentPageNode.appendChild(currentRowClone);
                let currentContentCellClone = currentRowClone.querySelector('.row-content');

                let children = Array.from(contentCell.childNodes);
                for (let j = 0; j < children.length; j++) {
                    let childClone = children[j].cloneNode(true);
                    currentContentCellClone.appendChild(childClone);

                    if (currentPageNode.offsetHeight > maxPageHeightPx) {
                        currentContentCellClone.removeChild(childClone);
                        currentPageNode = document.createElement('div');
                        currentPageNode.className = 'pdf-sandbox-page';
                        sandbox.appendChild(currentPageNode);
                        pagePagesNode.push(currentPageNode);

                        currentRowClone = document.createElement('div');
                        currentRowClone.className = 'lesson-row';
                        currentRowClone.innerHTML = `<div class="row-label">${labelText}</div><div class="row-content"></div>`;
                        currentPageNode.appendChild(currentRowClone);
                        currentContentCellClone = currentRowClone.querySelector('.row-content');
                        currentContentCellClone.appendChild(childClone);
                    }
                }
            }
        } else {
            const srcEditor = container.querySelector('.free-content-editor') || container;
            const topLevelNodes = Array.from(srcEditor.childNodes);
            let isNewPage = true;

            for (let j = 0; j < topLevelNodes.length; j++) {
                const node = topLevelNodes[j];
                if (isNewPage && isEmptyNode(node)) continue; 

                let nodeClone = node.cloneNode(true);
                currentPageNode.appendChild(nodeClone);

                if (currentPageNode.offsetHeight > maxPageHeightPx) {
                    currentPageNode.removeChild(nodeClone);

                    if (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length > 1) {
                        let partialShell = node.cloneNode(false);
                        currentPageNode.appendChild(partialShell);
                        
                        let children = Array.from(node.childNodes);
                        let splitIndex = 0;

                        for (let c = 0; c < children.length; c++) {
                            let childClone = children[c].cloneNode(true);
                            partialShell.appendChild(childClone);
                            if (currentPageNode.offsetHeight > maxPageHeightPx) {
                                partialShell.removeChild(childClone);
                                splitIndex = c;
                                break;
                            } else {
                                splitIndex = c + 1;
                            }
                        }

                        if (partialShell.childNodes.length === 0) {
                            currentPageNode.removeChild(partialShell);
                            splitIndex = 0;
                        }

                        currentPageNode = document.createElement('div');
                        currentPageNode.className = 'pdf-sandbox-page';
                        sandbox.appendChild(currentPageNode);
                        pagePagesNode.push(currentPageNode);
                        isNewPage = true;

                        if (splitIndex < children.length) {
                            let remainingShell = node.cloneNode(false);
                            for (let c = splitIndex; c < children.length; c++) {
                                remainingShell.appendChild(children[c].cloneNode(true));
                            }
                            if (remainingShell.childNodes.length > 0) {
                                currentPageNode.appendChild(remainingShell);
                                isNewPage = false;
                            }
                        }
                    } else {
                        let pulledQuestion = null;
                        if (isNodeDeText(node)) {
                            let lastChild = currentPageNode.lastElementChild; 
                            if (lastChild && isNodeQuestion(lastChild)) {
                                pulledQuestion = lastChild;
                                currentPageNode.removeChild(pulledQuestion);
                            }
                        }

                        currentPageNode = document.createElement('div');
                        currentPageNode.className = 'pdf-sandbox-page';
                        sandbox.appendChild(currentPageNode);
                        pagePagesNode.push(currentPageNode);
                        isNewPage = true;

                        if (pulledQuestion) {
                            currentPageNode.appendChild(pulledQuestion);
                            isNewPage = false;
                        }

                        if (!(isNewPage && isEmptyNode(node))) {
                            currentPageNode.appendChild(node.cloneNode(true));
                            isNewPage = false;
                        }
                    }
                } else {
                    isNewPage = false;
                }
            }
        }

        await new Promise(r => setTimeout(r, 400));
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4', true);

        for (let p = 0; p < pagePagesNode.length; p++) {
            if (p > 0) pdf.addPage();
            const canvas = await html2canvas(pagePagesNode[p], { scale: 3.125, backgroundColor: '#ffffff', useCORS: true, allowTaint: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            pdf.addImage(imgData, 'JPEG', 15, 15, 180, (canvas.height * 180) / canvas.width, undefined, 'FAST');
        }
        pdf.save(finalFileName);
    } catch (err) {
        alert("生成PDF錯誤: " + err.message);
    } finally {
        if (loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
        pdfGenerating = false;
        refreshPageBreakLines();
    }
}

document.getElementById('downloadPdfBtn').addEventListener('click', (e) => { e.preventDefault(); exportMultiPagePDF(); });
document.getElementById('rerenderMathBtn').addEventListener('click', async () => { 
    await rerenderMath(document.getElementById('lessonPages')); 
    setTimeout(refreshPageBreakLines, 300);
});

function bindDynamicEvents() {
    const container = document.getElementById('lessonPages');
    container.addEventListener('keyup', () => { saveSelection(); refreshPageBreakLines(); });
    container.addEventListener('mouseup', () => { saveSelection(); refreshPageBreakLines(); });
    container.addEventListener('focusin', () => { saveSelection(); });
    container.addEventListener('blur', () => { saveSelection(); }, true);

    document.addEventListener('click', () => {
        document.querySelectorAll('.resizable-img-wrapper').forEach(w => w.classList.remove('active'));
    });
}

function initResizableImage(wrapper) {
    wrapper.addEventListener('click', function(e) { 
        e.stopPropagation(); 
        document.querySelectorAll('.resizable-img-wrapper').forEach(w => w.classList.remove('active')); 
        this.classList.add('active'); 
    });
    
    wrapper.addEventListener('mousedown', function(e) {
        const rect = this.getBoundingClientRect();
        if (!(e.clientX >= rect.right - 15 && e.clientY >= rect.bottom - 15)) return;
        
        e.preventDefault(); 
        const startWidth = this.offsetWidth; 
        const startX = e.clientX; 
        const self = this;
        
        function doDrag(mEvent) { 
            self.style.width = (startWidth + (mEvent.clientX - startX)) + 'px'; 
            refreshPageBreakLines(); 
        }
        function stopDrag() { 
            document.removeEventListener('mousemove', doDrag); 
            document.removeEventListener('mouseup', stopDrag); 
            refreshPageBreakLines(); 
        }
        document.addEventListener('mousemove', doDrag); 
        document.addEventListener('mouseup', stopDrag);
    });
}