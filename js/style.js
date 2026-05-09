// T6 Human Study (static) - writing-style review.
// Reviewer assigns a 1-5 overall score per report. Persists to localStorage,
// final submit posts to FORMSPREE_URL or downloads JSON fallback.

(function () {
    "use strict";

    const FORMSPREE_URL = "https://formspree.io/f/xbdwokdz";

    const sport = window.T6_SPORT || "basketball";
    const STUDY_LABEL = `T6_${sport}_style`;
    const STORAGE_SESSION = `t6_style_${sport}_session`;
    const STORAGE_SCORES  = `t6_style_${sport}_scores`;
    const SAMPLES = window.SAMPLES || [];
    const TOTAL = SAMPLES.length;

    // Session bootstrap
    let session;
    try { session = JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null"); }
    catch (_) { session = null; }
    if (!session || !session.userId) {
        window.location.href = `start.html?study=style&sport=${sport}`;
        return;
    }
    document.getElementById("navUserId").textContent = session.userId;

    let scores = {};
    try { scores = JSON.parse(localStorage.getItem(STORAGE_SCORES) || "{}") || {}; }
    catch (_) { scores = {}; }
    function persistScores() { localStorage.setItem(STORAGE_SCORES, JSON.stringify(scores)); }

    const els = {
        itemNumber: document.getElementById("itemNumber"),
        itemMeta:   document.getElementById("itemMeta"),
        modelText:  document.getElementById("modelText"),
        radios:     document.querySelectorAll("input[name=overall]"),
        errorMessage: document.getElementById("errorMessage"),
        savedMessage: document.getElementById("savedMessage"),
        prevBtn:   document.getElementById("prevBtn"),
        submitBtn: document.getElementById("submitBtn"),
        nextBtn:   document.getElementById("nextBtn"),
        finishBtn: document.getElementById("finishBtn"),
        progressText: document.getElementById("progressText"),
        progressBar:  document.getElementById("progressBar"),
        submitOverlay: document.getElementById("submitOverlay"),
        submitStatus:  document.getElementById("submitStatus"),
        submitSuccess: document.getElementById("submitSuccess"),
        submitError:   document.getElementById("submitError"),
        submitErrorText: document.getElementById("submitErrorText"),
        downloadFallbackBtn: document.getElementById("downloadFallbackBtn"),
        retrySubmitBtn:      document.getElementById("retrySubmitBtn"),
    };

    let currentIdx = 0;

    function selectedScore() {
        for (const r of els.radios) if (r.checked) return parseInt(r.value, 10);
        return null;
    }
    function setSelectedScore(v) {
        for (const r of els.radios) r.checked = (parseInt(r.value, 10) === v);
    }
    function clearRadios() { for (const r of els.radios) r.checked = false; }

    function renderCurrent() {
        const sample = SAMPLES[currentIdx];
        els.itemNumber.textContent = `${currentIdx + 1} of ${TOTAL}`;
        els.itemMeta.textContent = `component #${sample.component_id}`;
        els.modelText.textContent = sample.model_text;

        const existing = scores[String(sample.id)];
        if (existing && typeof existing.overall === "number") {
            setSelectedScore(existing.overall);
        } else {
            clearRadios();
        }

        hideMessages();
        updateButtons();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function answeredCount() { return Object.keys(scores).length; }

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

    function submitCurrent() {
        const score = selectedScore();
        if (!Number.isInteger(score) || score < 1 || score > 5) {
            showError("Please pick a score from 1 to 5 before submitting.");
            return false;
        }
        const sample = SAMPLES[currentIdx];
        scores[String(sample.id)] = {
            id: sample.id,
            component_id: sample.component_id,
            model: sample.model,
            overall: score,
            timestamp: new Date().toISOString(),
        };
        persistScores();
        showSaved();
        updateButtons();
        return true;
    }

    function buildPayload() {
        return {
            study: STUDY_LABEL,
            sport: sport,
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
        a.download = `t6_${sport}_style_${safeId}_${session.sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function showOverlayState(state, errorText) {
        els.submitOverlay.style.display = "flex";
        els.submitStatus.style.display  = state === "loading" ? "block" : "none";
        els.submitSuccess.style.display = state === "success" ? "block" : "none";
        els.submitError.style.display   = state === "error"   ? "block" : "none";
        if (state === "error" && errorText) els.submitErrorText.textContent = errorText;
    }

    async function submitFinal() {
        const payload = buildPayload();
        if (!FORMSPREE_URL) { showOverlayState("error", "No remote endpoint configured."); return; }
        showOverlayState("loading");
        try {
            const resp = await fetch(FORMSPREE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) throw new Error(`Endpoint returned ${resp.status}`);
            showOverlayState("success");
            localStorage.removeItem(STORAGE_SCORES);
            localStorage.removeItem(STORAGE_SESSION);
        } catch (e) {
            showOverlayState("error", e.message || "Network error.");
        }
    }

    els.submitBtn.addEventListener("click", () => {
        if (!submitCurrent()) return;
        if (currentIdx < TOTAL - 1) { currentIdx++; renderCurrent(); }
        else { updateButtons(); }
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
