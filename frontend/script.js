
/* =========================================
   IRIS AI - CLASSIFICATION DASHBOARD
   Frontend JavaScript
========================================= */


/* 1. API CONFIGURATION */

const API_BASE_URL = "http://127.0.0.1:8000";
const HISTORY_KEY = "iris_ai_prediction_history";

let evaluationData = null;
let overviewChart = null;
let classificationChart = null;
let comparisonChart = null;


/* 2. GENERAL HELPER FUNCTIONS */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value;
}

function addListener(id, eventName, callback) {
    const element = getElement(id);

    if (element) {
        element.addEventListener(eventName, callback);
    } else {
        console.warn(`IRIS AI: Element with ID "${id}" was not found.`);
    }
}

function formatPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "N/A";

    return `${(number * 100).toFixed(2)}%`;
}

function capitalizeSpecies(species) {
    return String(species).replace(/\b\w/g, letter => letter.toUpperCase());
}

function showError(message) {
    const errorBox = getElement("predictionError");

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    const errorBox = getElement("predictionError");

    if (errorBox) {
        errorBox.classList.add("hidden");
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function showTableMessage(id, message, columns) {
    const table = getElement(id);

    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="${columns}">${escapeHTML(message)}</td>
            </tr>
        `;
    }
}


/* 3. API CONNECTION AND EVALUATION DATA */

async function checkAPIStatus() {
    const status = getElement("apiStatus");

    try {
        const response = await fetch(`${API_BASE_URL}/`);

        if (!response.ok) {
            throw new Error("API unavailable");
        }

        if (status) status.textContent = "Connected";

    } catch (error) {
        if (status) status.textContent = "Disconnected";

        console.error("API connection error:", error);
    }
}

async function loadEvaluationData() {
    try {
        const response = await fetch(`${API_BASE_URL}/metrics`);

        if (!response.ok) {
            throw new Error("Unable to retrieve evaluation results.");
        }

        evaluationData = await response.json();

        displayDatasetOverview();
        displayEvaluationMetrics();

        // FIX: Load the five prediction-page metrics automatically.
        displayPredictionPerformanceMetrics();

        displayConfusionMatrix();
        displayClassificationReport();
        displayModelComparison();

    } catch (error) {
        console.error("Metrics loading error:", error);

        setText("apiStatus", "Metrics unavailable");

        [
            "metricAccuracy",
            "metricPrecision",
            "metricRecall",
            "metricF1",
            "predictionAccuracy",
            "predictionPrecision",
            "predictionRecall",
            "predictionF1",
            "predictionRocAuc"
        ].forEach(id => setText(id, "N/A"));

        showTableMessage(
            "classificationTable",
            "Evaluation results could not be loaded.",
            5
        );

        showTableMessage(
            "comparisonTable",
            "Model comparison data could not be loaded.",
            6
        );
    }
}


/* 4. OVERVIEW DASHBOARD */

function displayDatasetOverview() {
    if (!evaluationData) return;

    const dataset = evaluationData.dataset;
    const test = evaluationData.test_evaluation;

    setText("totalObservations", dataset.total_observations);
    setText("totalFeatures", dataset.features.length);
    setText("totalSpecies", dataset.species.length);
    setText("selectedModel", evaluationData.selected_model);
    setText("overviewAccuracy", formatPercent(test.accuracy));
    setText("overviewRoc", formatPercent(test.roc_auc));

    createOverviewChart();
}

function createOverviewChart() {
    if (!evaluationData || typeof Chart === "undefined") return;

    const canvas = getElement("overviewChart");

    if (!canvas) return;

    const test = evaluationData.test_evaluation;

    if (overviewChart) {
        overviewChart.destroy();
    }

    overviewChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: ["Accuracy", "ROC-AUC"],

            datasets: [{
                label: "Performance",

                data: [
                    test.accuracy * 100,
                    test.roc_auc * 100
                ],

                backgroundColor: [
                    "#174A8B",
                    "#A8D92F"
                ],

                borderRadius: 7,
                barThickness: 38
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,

                    ticks: {
                        callback: value => `${value}%`
                    }
                }
            }
        }
    });
}


/* 5. MODEL EVALUATION */

function displayEvaluationMetrics() {
    if (!evaluationData) return;

    const report =
        evaluationData.test_evaluation.classification_report;

    const macro = report["macro avg"];

    setText(
        "metricAccuracy",
        formatPercent(evaluationData.test_evaluation.accuracy)
    );

    setText(
        "metricPrecision",
        formatPercent(macro.precision)
    );

    setText(
        "metricRecall",
        formatPercent(macro.recall)
    );

    setText(
        "metricF1",
        formatPercent(macro["f1-score"])
    );

    createClassificationChart();
}


/*
 * PREDICTION PAGE PERFORMANCE METRICS
 *
 * These are overall test-set model evaluation metrics.
 * They are not the confidence score for an individual prediction.
 *
 * This function uses evaluationData already retrieved by
 * loadEvaluationData(). It does not make another API request.
 */

function displayPredictionPerformanceMetrics() {
    if (!evaluationData) return;

    const evaluation = evaluationData.test_evaluation;
    const report = evaluation.classification_report;
    const macro = report["macro avg"];

    setText(
        "predictionAccuracy",
        formatPercent(evaluation.accuracy)
    );

    setText(
        "predictionPrecision",
        formatPercent(macro.precision)
    );

    setText(
        "predictionRecall",
        formatPercent(macro.recall)
    );

    setText(
        "predictionF1",
        formatPercent(macro["f1-score"])
    );

    setText(
        "predictionRocAuc",
        formatPercent(evaluation.roc_auc)
    );
}


function createClassificationChart() {
    if (!evaluationData || typeof Chart === "undefined") return;

    const canvas = getElement("classificationChart");

    if (!canvas) return;

    const report =
        evaluationData.test_evaluation.classification_report;

    const species = evaluationData.dataset.species;

    if (classificationChart) {
        classificationChart.destroy();
    }

    classificationChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: species.map(capitalizeSpecies),

            datasets: [
                {
                    label: "Precision",

                    data: species.map(
                        item => report[item].precision * 100
                    ),

                    backgroundColor: "#174A8B",
                    borderRadius: 5
                },

                {
                    label: "Recall",

                    data: species.map(
                        item => report[item].recall * 100
                    ),

                    backgroundColor: "#F28C28",
                    borderRadius: 5
                },

                {
                    label: "F1-Score",

                    data: species.map(
                        item => report[item]["f1-score"] * 100
                    ),

                    backgroundColor: "#A8D92F",
                    borderRadius: 5
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            size: 10
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,

                    ticks: {
                        callback: value => `${value}%`
                    }
                }
            }
        }
    });
}


function displayConfusionMatrix() {
    if (!evaluationData) return;

    const container = getElement("confusionMatrix");

    if (!container) return;

    const matrix =
        evaluationData.test_evaluation.confusion_matrix;

    const species = evaluationData.dataset.species;

    let html = `
        <table class="confusion-table">
            <thead>
                <tr>
                    <th>Actual / Predicted</th>
    `;

    species.forEach(name => {
        html += `
            <th>${escapeHTML(capitalizeSpecies(name))}</th>
        `;
    });

    html += `
                </tr>
            </thead>
            <tbody>
    `;

    matrix.forEach((row, rowIndex) => {
        html += `
            <tr>
                <th>
                    ${escapeHTML(capitalizeSpecies(species[rowIndex]))}
                </th>
        `;

        row.forEach((value, columnIndex) => {
            const cellClass =
                rowIndex === columnIndex
                    ? "correct-cell"
                    : "incorrect-cell";

            html += `
                <td class="${cellClass}">
                    ${Number(value)}
                </td>
            `;
        });

        html += "</tr>";
    });

    html += `
            </tbody>
        </table>

        <p class="confusion-caption">
            Green cells represent correctly classified flowers.
            Orange cells represent incorrect classifications.
        </p>
    `;

    container.innerHTML = html;
}


function displayClassificationReport() {
    if (!evaluationData) return;

    const table = getElement("classificationTable");

    if (!table) return;

    const report =
        evaluationData.test_evaluation.classification_report;

    const species = evaluationData.dataset.species;

    let html = "";

    species.forEach(name => {
        const result = report[name];

        html += `
            <tr>
                <td>
                    <span class="model-tag">
                        ${escapeHTML(capitalizeSpecies(name))}
                    </span>
                </td>

                <td>${formatPercent(result.precision)}</td>
                <td>${formatPercent(result.recall)}</td>
                <td>${formatPercent(result["f1-score"])}</td>
                <td>${Number(result.support).toFixed(0)}</td>
            </tr>
        `;
    });

    const macro = report["macro avg"];

    html += `
        <tr>
            <td><strong>Macro Average</strong></td>

            <td>${formatPercent(macro.precision)}</td>
            <td>${formatPercent(macro.recall)}</td>
            <td>${formatPercent(macro["f1-score"])}</td>
            <td>${Number(macro.support).toFixed(0)}</td>
        </tr>
    `;

    table.innerHTML = html;
}


/* 6. MODEL COMPARISON */

function displayModelComparison() {
    if (!evaluationData) return;

    const results = evaluationData.cross_validation;
    const table = getElement("comparisonTable");

    if (table) {
        let html = "";

        results.forEach(result => {
            const isSelected =
                result.Model === evaluationData.selected_model;

            html += `
                <tr class="${isSelected ? "selected-row" : ""}">

                    <td>
                        <span class="model-tag ${isSelected ? "best-tag" : ""}">
                            ${escapeHTML(result.Model)}
                        </span>

                        ${isSelected ? " ✓" : ""}
                    </td>

                    <td>${formatPercent(result["Mean Accuracy"])}</td>
                    <td>${formatPercent(result["Mean Precision"])}</td>
                    <td>${formatPercent(result["Mean Recall"])}</td>
                    <td>${formatPercent(result["Mean F1-Score"])}</td>
                    <td>${formatPercent(result["Mean ROC-AUC"])}</td>

                </tr>
            `;
        });

        table.innerHTML = html;
    }

    createComparisonChart(results);
}


function createComparisonChart(results) {
    if (typeof Chart === "undefined") return;

    const canvas = getElement("comparisonChart");

    if (!canvas) return;

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    comparisonChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: results.map(item => item.Model),

            datasets: [{
                label: "Mean Accuracy",

                data: results.map(
                    item => item["Mean Accuracy"] * 100
                ),

                backgroundColor: results.map(item =>
                    item.Model === evaluationData.selected_model
                        ? "#F28C28"
                        : "#174A8B"
                ),

                borderRadius: 7,
                barThickness: 40
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    min: 85,
                    max: 100,

                    ticks: {
                        callback: value => `${value}%`
                    }
                },

                x: {
                    ticks: {
                        maxRotation: 20,
                        minRotation: 0
                    }
                }
            }
        }
    });
}


/* 7. FLOWER PREDICTION */

addListener("predictionForm", "submit", async function(event) {
    event.preventDefault();

    hideError();

    const button = getElement("predictButton");

    if (!button) return;

    const originalText = button.innerHTML;

    const inputData = {
        sepal_length: Number(getElement("sepalLength")?.value),
        sepal_width: Number(getElement("sepalWidth")?.value),
        petal_length: Number(getElement("petalLength")?.value),
        petal_width: Number(getElement("petalWidth")?.value)
    };

    for (const [name, value] of Object.entries(inputData)) {
        if (
            !Number.isFinite(value) ||
            value <= 0 ||
            value > 20
        ) {
            showError(
                `Please enter a valid value for ${name.replaceAll("_", " ")}. ` +
                "Measurements must be greater than 0 and not exceed 20 cm."
            );

            return;
        }
    }

    button.disabled = true;
    button.textContent = "Processing...";

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(inputData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Prediction could not be completed."
            );
        }

        displayPredictionResult(result);

        savePredictionHistory(inputData, result);

    } catch (error) {
        console.error("Prediction error:", error);

        showError(
            error.message.includes("Failed to fetch")
                ? "Unable to connect to the prediction server. Please make sure the FastAPI backend is running."
                : error.message
        );

    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
});


function displayPredictionResult(result) {
    const emptyResult = getElement("emptyResult");
    const predictionResult = getElement("predictionResult");

    if (emptyResult) {
        emptyResult.classList.add("hidden");
    }

    if (predictionResult) {
        predictionResult.classList.remove("hidden");
    }

    setText(
        "predictedSpecies",
        `Iris ${result.predicted_species}`
    );

    setText(
        "predictionMessage",
        result.message
    );

    setText(
        "confidenceValue",
        `${Number(result.confidence).toFixed(2)}%`
    );

    const confidenceBar = getElement("confidenceBar");

    if (confidenceBar) {
        confidenceBar.style.width =
            `${Math.min(100, Math.max(0, Number(result.confidence)))}%`;
    }

    const flower = getElement("resultFlower");

    if (flower) {
        const species =
            String(result.predicted_species).toLowerCase();

        if (species === "setosa") {
            flower.style.background = "#FFF1E3";
            flower.style.color = "#F28C28";

        } else if (species === "versicolor") {
            flower.style.background = "#EAF1FA";
            flower.style.color = "#174A8B";

        } else {
            flower.style.background = "#F2F9DF";
            flower.style.color = "#6D9A13";
        }
    }
}


/* 8. PREDICTION HISTORY */

function getPredictionHistory() {
    try {
        const savedHistory =
            localStorage.getItem(HISTORY_KEY);

        const parsedHistory =
            savedHistory ? JSON.parse(savedHistory) : [];

        return Array.isArray(parsedHistory)
            ? parsedHistory
            : [];

    } catch (error) {
        console.error("History retrieval error:", error);
        return [];
    }
}


function savePredictionHistory(inputData, result) {
    const history = getPredictionHistory();

    const record = {
        id: Date.now(),
        date: new Date().toISOString(),
        measurements: inputData,
        species: result.predicted_species,
        confidence: result.confidence
    };

    history.unshift(record);

    try {
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history.slice(0, 100))
        );

    } catch (error) {
        console.error("Unable to save prediction history:", error);
    }

    displayPredictionHistory();
}


function displayPredictionHistory() {
    const history = getPredictionHistory();

    setText("historyTotal", history.length);

    const table = getElement("historyTable");

    if (!table) return;

    if (history.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4">
                    No prediction history available yet.
                </td>
            </tr>
        `;

        setText("mostPredicted", "None");

        return;
    }

    const counts = {};

    history.forEach(record => {
        counts[record.species] =
            (counts[record.species] || 0) + 1;
    });

    const mostPredicted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0][0];

    setText(
        "mostPredicted",
        `Iris ${mostPredicted}`
    );

    let html = "";

    history.forEach(record => {
        const date = new Date(record.date);

        const formattedDate =
            date.toLocaleDateString() + " " +
            date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

        const measurements = record.measurements || {};

        html += `
            <tr>

                <td>${escapeHTML(formattedDate)}</td>

                <td>
                    ${Number(measurements.sepal_length).toFixed(1)},
                    ${Number(measurements.sepal_width).toFixed(1)},
                    ${Number(measurements.petal_length).toFixed(1)},
                    ${Number(measurements.petal_width).toFixed(1)} cm
                </td>

                <td>
                    <span class="history-species">
                        Iris ${escapeHTML(record.species)}
                    </span>
                </td>

                <td>
                    ${Number(record.confidence).toFixed(2)}%
                </td>

            </tr>
        `;
    });

    table.innerHTML = html;
}


/* 9. CLEAR PREDICTION HISTORY */

addListener("clearHistory", "click", function() {
    const history = getPredictionHistory();

    if (history.length === 0) {
        alert("There is no prediction history to clear.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete all saved prediction history?"
    );

    if (confirmed) {
        localStorage.removeItem(HISTORY_KEY);

        displayPredictionHistory();

        alert("Prediction history cleared successfully.");
    }
});


/* 10. RESET PREDICTION FORM */

addListener("resetPrediction", "click", function() {
    hideError();

    const predictionResult = getElement("predictionResult");
    const emptyResult = getElement("emptyResult");
    const confidenceBar = getElement("confidenceBar");

    if (predictionResult) {
        predictionResult.classList.add("hidden");
    }

    if (emptyResult) {
        emptyResult.classList.remove("hidden");
    }

    if (confidenceBar) {
        confidenceBar.style.width = "0%";
    }
});


/* 11. DOWNLOAD EVALUATION REPORT */

function downloadEvaluationReport() {
    if (!evaluationData) {
        alert(
            "Evaluation results are not available. Please check the API connection."
        );

        return;
    }

    const report =
        evaluationData.test_evaluation.classification_report;

    const crossValidation =
        evaluationData.cross_validation;

    const rows = [
        ["IRIS AI - EVALUATION REPORT"],

        ["Generated At", new Date().toLocaleString()],

        ["Selected Model", evaluationData.selected_model],

        [
            "Total Observations",
            evaluationData.dataset.total_observations
        ],

        [
            "Test Accuracy",
            formatPercent(evaluationData.test_evaluation.accuracy)
        ],

        [
            "Test ROC-AUC",
            formatPercent(evaluationData.test_evaluation.roc_auc)
        ],

        [],

        ["CLASSIFICATION REPORT"],

        [
            "Species",
            "Precision",
            "Recall",
            "F1-Score",
            "Support"
        ]
    ];

    evaluationData.dataset.species.forEach(species => {
        const item = report[species];

        rows.push([
            capitalizeSpecies(species),
            formatPercent(item.precision),
            formatPercent(item.recall),
            formatPercent(item["f1-score"]),
            item.support
        ]);
    });

    rows.push([]);

    rows.push(["FIVE-FOLD CROSS-VALIDATION"]);

    rows.push([
        "Model",
        "Mean Accuracy",
        "Mean Precision",
        "Mean Recall",
        "Mean F1-Score",
        "Mean ROC-AUC"
    ]);

    crossValidation.forEach(item => {
        rows.push([
            item.Model,
            formatPercent(item["Mean Accuracy"]),
            formatPercent(item["Mean Precision"]),
            formatPercent(item["Mean Recall"]),
            formatPercent(item["Mean F1-Score"]),
            formatPercent(item["Mean ROC-AUC"])
        ]);
    });

    const csv = rows.map(row =>
        row.map(value => {
            const text = String(value ?? "");

            return `"${text.replace(/"/g, '""')}"`;
        }).join(",")
    ).join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "iris_ai_evaluation_report.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}

addListener(
    "downloadReport",
    "click",
    downloadEvaluationReport
);


/* 12. DASHBOARD NAVIGATION */

const pageTitles = {
    overview: "Dashboard Overview",
    prediction: "Flower Prediction",
    evaluation: "Model Evaluation",
    comparison: "Model Comparison",
    history: "Prediction History",
    about: "About Project"
};


function navigateToSection(sectionId) {
    const section = getElement(sectionId);

    if (!section) return;

    document.querySelectorAll(".page-section").forEach(item => {
        item.classList.remove("active-section");
    });

    section.classList.add("active-section");

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === sectionId
        );
    });

    setText(
        "pageTitle",
        pageTitles[sectionId] || "IRIS AI Dashboard"
    );

    const sidebar = getElement("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (sectionId === "overview" && overviewChart) {
        overviewChart.resize();
    }

    if (sectionId === "evaluation" && classificationChart) {
        classificationChart.resize();
    }

    if (sectionId === "comparison" && comparisonChart) {
        comparisonChart.resize();
    }

    if (sectionId === "history") {
        displayPredictionHistory();
    }
}


document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function(event) {
        event.preventDefault();

        navigateToSection(this.dataset.section);
    });
});


document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", function() {
        navigateToSection(this.dataset.go);
    });
});


/* 13. MOBILE SIDEBAR */

addListener("menuToggle", "click", function() {
    const sidebar = getElement("sidebar");

    if (sidebar) {
        sidebar.classList.toggle("open");
    }
});


document.addEventListener("click", function(event) {
    const sidebar = getElement("sidebar");
    const toggle = getElement("menuToggle");

    if (
        sidebar &&
        toggle &&
        window.innerWidth <= 800 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !toggle.contains(event.target)
    ) {
        sidebar.classList.remove("open");
    }
});


/* 14. INITIALIZE DASHBOARD */

document.addEventListener("DOMContentLoaded", async function() {

    // Load previously saved prediction history.
    displayPredictionHistory();

    // Check API connection and retrieve model evaluation results.
    await Promise.all([
        checkAPIStatus(),
        loadEvaluationData()
    ]);

});
