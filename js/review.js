// T6 Human Study (static) - basketball report review.
// Persists per-item checkbox state in localStorage. On Finish, attempts to
// submit to FORMSPREE_URL if set; otherwise (or on failure) prompts the user
// to download a JSON of their responses.

(function () {
    "use strict";

    // ===== CONFIG =====
    // Set this to your Formspree endpoint to enable automatic submission.
    // Leave empty ("") to skip remote submission and just offer a JSON download.
    const FORMSPREE_URL = "";
    const STUDY_LABEL = "T6_basketball";
    const STORAGE_SESSION = "t6_basketball_session";
    const STORAGE_SCORES = "t6_basketball_scores";
    const TOTAL = SAMPLES.length;

    // ===== Session bootstrap =====
    let session;
    try {
        session = JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null");
    } catch (_) { session = null; }
    if (!session || !session.userId) {
        window.location.href = "index.html";
        return;
    }
    document.getElementById("navUserId").textContent = session.userId;

    let scores = {};
    try {
        scores = JSON.parse(localStorage.getItem(STORAGE_SCORES) || "{}") || {};
    } catch (_) { scores = {}; }

    function persistScores() {
        localStorage.setItem(STORAGE_SCORES, JSON.stringify(scores));
    }

    // ===== DOM refs =====
    const els = {
        itemNumber: document.getElementById("itemNumber"),
        itemMeta: document.getElementById("itemMeta"),
        modelText: document.getElementById("modelText"),
        coverageList: document.getElementById("coverageList"),
        errorMessage: document.getElementById("errorMessage"),
        savedMessage: document.getElementById("savedMessage"),
        prevBtn: document.getElementById("prevBtn"),
        submitBtn: document.getElementById("submitBtn"),
        nextBtn: document.getElementById("nextBtn"),
        finishBtn: document.getElementById("finishBtn"),
        progressText: document.getElementById("progressText"),
        progressBar: document.getElementById("progressBar"),
        submitOverlay: document.getElementById("submitOverlay"),
        submitStatus: document.getElementById("submitStatus"),
        submitSuccess: document.getElementById("submitSuccess"),
        submitError: document.getElementById("submitError"),
        submitErrorText: document.getElementById("submitErrorText"),
        downloadFallbackBtn: document.getElementById("downloadFallbackBtn"),
        retrySubmitBtn: document.getElementById("retrySubmitBtn"),
    };

    let currentIdx = 0;

    // ===== Rendering =====
    function getCheckedIndices() {
        const boxes = els.coverageList.querySelectorAll("input[type=checkbox]");
        const checked = [];
        boxes.forEach((cb, i) => { if (cb.checked) checked.push(i); });
        return checked;
    }

    function renderCurrent() {
        const sample = SAMPLES[currentIdx];
        els.itemNumber.textContent = `${currentIdx + 1} of ${TOTAL}`;
        els.itemMeta.textContent = `component #${sample.component_id}`;
        els.modelText.textContent = sample.model_text;

        const existing = scores[String(sample.id)];
        const preChecked = new Set(existing && Array.isArray(existing.checked) ? existing.checked : []);

        els.coverageList.innerHTML = "";
        sample.coverage_facts.forEach((fact, i) => {
            const li = document.createElement("li");
            const id = `fact-${i}`;
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.id = id;
            cb.checked = preChecked.has(i);

            const label = document.createElement("label");
            label.htmlFor = id;
            label.textContent = fact;

            li.appendChild(cb);
            li.appendChild(label);
            els.coverageList.appendChild(li);
        });

        hideMessages();
        updateButtons();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function answeredCount() {
        return Object.keys(scores).length;
    }

    function updateButtons() {
        els.prevBtn.disabled = currentIdx === 0;
        const isLast = currentIdx === TOTAL - 1;
        const ans = answeredCount();

        if (isLast) {
            els.nextBtn.style.display = "none";
            if (ans === TOTAL) {
                els.submitBtn.style.display = "none";
                els.finishBtn.style.display = "inline-block";
            } else {
                els.submitBtn.style.display = "inline-block";
                els.finishBtn.style.display = "none";
            }
        } else {
            els.submitBtn.style.display = "inline-block";
            els.nextBtn.style.display = "none";
            els.finishBtn.style.display = "none";
        }

        els.progressText.textContent = `${ans} / ${TOTAL}`;
        els.progressBar.style.width = `${(ans / TOTAL) * 100}%`;
    }

    function hideMessages() {
        els.errorMessage.style.display = "none";
        els.savedMessage.style.display = "none";
    }

    function showError(msg) {
        els.errorMessage.textContent = msg;
        els.errorMessage.style.display = "block";
        els.savedMessage.style.display = "none";
    }

    function showSaved() {
        els.savedMessage.style.display = "flex";
        els.errorMessage.style.display = "none";
        setTimeout(() => { els.savedMessage.style.display = "none"; }, 1800);
    }

    // ===== Submit current item (saves locally) =====
    function submitCurrent() {
        const sample = SAMPLES[currentIdx];
        const checked = getCheckedIndices();
        const total = sample.coverage_facts.length;
        const saliency = total ? Math.round(checked.length / total * 100) : 0;

        scores[String(sample.id)] = {
            id: sample.id,
            component_id: sample.component_id,
            model: sample.model,
            checked,
            total_facts: total,
            saliency,
            timestamp: new Date().toISOString(),
        };
        persistScores();
        showSaved();
        updateButtons();
        return true;
    }

    // ===== Final payload + submission =====
    function buildPayload() {
        return {
            study: STUDY_LABEL,
            user_id: session.userId,
            email: session.userEmail || "",
            session_id: session.sessionId,
            started_at: session.startedAt,
            completed_at: new Date().toISOString(),
            total_samples: TOTAL,
            answered: answeredCount(),
            scores,
        };
    }

    function downloadPayload() {
        const payload = buildPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeId = (session.userId || "user").replace(/[^a-zA-Z0-9_-]/g, "_");
        a.href = url;
        a.download = `t6_basketball_${safeId}_${session.sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function showOverlayState(state, errorText) {
        els.submitOverlay.style.display = "flex";
        els.submitStatus.style.display = state === "loading" ? "block" : "none";
        els.submitSuccess.style.display = state === "success" ? "block" : "none";
        els.submitError.style.display = state === "error" ? "block" : "none";
        if (state === "error" && errorText) els.submitErrorText.textContent = errorText;
    }

    async function submitFinal() {
        const payload = buildPayload();

        if (!FORMSPREE_URL) {
            // No remote endpoint configured — go straight to download flow.
            showOverlayState("error", "No remote endpoint configured.");
            return;
        }

        showOverlayState("loading");
        try {
            const resp = await fetch(FORMSPREE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) throw new Error(`Endpoint returned ${resp.status}`);
            showOverlayState("success");
            // Clear session/scores after successful submission so the next user starts fresh.
            localStorage.removeItem(STORAGE_SCORES);
            localStorage.removeItem(STORAGE_SESSION);
        } catch (e) {
            showOverlayState("error", e.message || "Network error.");
        }
    }

    // ===== Wire up buttons =====
    els.submitBtn.addEventListener("click", () => {
        submitCurrent();
        if (currentIdx < TOTAL - 1) {
            currentIdx++;
            renderCurrent();
        } else {
            updateButtons();
        }
    });
    els.nextBtn.addEventListener("click", () => {
        if (currentIdx < TOTAL - 1) { currentIdx++; renderCurrent(); }
    });
    els.prevBtn.addEventListener("click", () => {
        if (currentIdx > 0) { currentIdx--; renderCurrent(); }
    });
    els.finishBtn.addEventListener("click", submitFinal);
    els.downloadFallbackBtn.addEventListener("click", downloadPayload);
    els.retrySubmitBtn.addEventListener("click", submitFinal);

    renderCurrent();
})();
