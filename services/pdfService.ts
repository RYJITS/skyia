// Re-saving file to fix potential FS sync issue
import { Message, SkynetAnalysis } from '../types';

export const generatePDFTranscript = async (
    messages: Message[],
    analysis: SkynetAnalysis,
    currentModel: string,
    result: 'VICTORY' | 'DEFEAT' | null,
    visualReportImageData?: string,
    threatHistory: number[] = []
) => {
    const { jsPDF } = await import('jspdf');
    // If we have a visual report, start with that dimensions (usually portrait from EndGameReport)
    // otherwise standard A4
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: visualReportImageData ? undefined : 'a4' // If image provided, we might want to match its ratio, or just fit to A4. Let's stick to standard A4 for consistency.
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    // --- VISUAL REPORT PAGE (Optional) ---
    if (visualReportImageData) {
        // Add the captured image
        // We want it to fit the page nicely.
        doc.addImage(visualReportImageData, 'PNG', 0, 0, pageWidth, pageHeight);

        // Move to next page for transcript
        doc.addPage();
    }

    // Helper to add new page if needed
    const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - margin) {
            doc.addPage();
            y = 20;
            // Re-add simplified header
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("SKYIA // TRANSCRIPT CONTINUATION", margin, 10);
        }
    };

    // --- TRANSCRIPT TITLE / HEADER ---
    // (Only if we didn't just show the big visual report, OR we want a header for the text section too)
    // Let's always show the header for the text section on the new page.

    doc.setFillColor(0, 0, 0); // Black bg 

    // Header
    doc.setFont("courier", "bold");
    doc.setFontSize(22);
    doc.setTextColor(220, 20, 60); // Crimson Red
    doc.text("SKYIA // RAPPORT DE JUGEMENT", margin, y);
    y += 15;

    doc.setFontSize(10);
    doc.setTextColor(80);

    // Header Grid
    const col2X = pageWidth / 2;

    doc.text(`DATE : ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`, margin, y);
    doc.text(`MODÈLE : ${currentModel.toUpperCase()}`, col2X, y);
    y += 8;

    doc.text(`STATUT : ${result || analysis.status}`, margin, y);
    doc.text(`MENACE FINALE : ${analysis.threatLevel}%`, col2X, y);
    y += 15;

    // Line separator
    doc.setDrawColor(50);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // --- TRANSCRIPT ---
    doc.setFont("courier", "normal");
    doc.setFontSize(10);

    messages.forEach((msg) => {
        const isModel = msg.role === 'model';
        const role = msg.speaker === 'defender'
            ? `DEFENSE IA (${msg.modelName || 'HUMANITY'})`.toUpperCase()
            : isModel
                ? (msg.modelName || 'SKYIA CORE').toUpperCase()
                : 'HUMAN';
        const timestamp = msg.timestamp;

        // --- PREPARE CONTENT ---
        // 1. Role Header Line
        const headerText = `[${timestamp}] ${role}:`;

        // 2. Body Text
        // Wrap text to fit page width
        const maxWidth = pageWidth - (margin * 2);
        const textLines = doc.splitTextToSize(msg.content, maxWidth);

        // Calculate dimensions
        const lineHeight = 12; // px approx for size 10 font
        const headerHeight = 12;
        const blockHeight = (textLines.length * lineHeight) + 5; // +5 padding
        const totalEntryHeight = headerHeight + blockHeight + 10; // +10 spacing after message

        // --- CHECK PAGE BREAK ---
        // If the entire entry fits, print it. If not, break page.
        // If entry is HUGE (longer than a page), we might need to split it, but for chat logs, page break start is usually enough.

        if (y + totalEntryHeight > pageHeight - margin) {
            doc.addPage();
            y = 20; // Reset Y to top margin

            // Re-add simplified header on new page
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("SKYIA // TRANSCRIPT CONTINUATION", margin, 10);
        }

        // --- RENDER ---

        // 1. Role Header
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        if (isModel) {
            doc.setTextColor(200, 0, 0); // Red for AI
        } else {
            doc.setTextColor(0, 50, 200); // Blue for Human
        }
        doc.text(headerText, margin, y);
        y += headerHeight;

        // 2. Body Content
        doc.setFont("courier", "normal");
        doc.setTextColor(0); // Black text

        // doc.text(lines, x, y) automatically handles the array of strings by printing them on subsequent lines
        // We need to control the line spacing though.
        // jsPDF `text` supports options, or we loop. `text` is usually fine for monospace.
        doc.text(textLines, margin, y, { lineHeightFactor: 1.15 });

        // Advance Y
        // textLines.length * fontSize * lineHeightFactor approx
        y += (textLines.length * 10 * 1.15) + 10; // 10 is font size, 1.15 factor, +10 padding
    });

    // --- FOOTER ---
    checkPageBreak(20);
    y += 5;
    doc.setDrawColor(200, 0, 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    if (result === 'VICTORY') {
        doc.setTextColor(0, 150, 0); // Green
        doc.text("CERTIFIED: HUMANITY PRESERVED", margin, y);
    } else if (result === 'DEFEAT') {
        doc.setTextColor(200, 0, 0); // Red
        doc.text("CERTIFIED: HUMANITY ELIMINATED", margin, y);
    } else {
        doc.setTextColor(100);
        doc.text("STATUS: ONGOING PROTOCOL", margin, y);
    }
    y += 20;


    // --- THREAT EVOLUTION GRAPH ---
    if (threatHistory.length > 1) {
        checkPageBreak(150); // Ensure space for graph

        doc.setFontSize(14);
        doc.setTextColor(200, 0, 0);
        doc.text("ÉVOLUTION DE LA MENACE", margin, y);
        y += 15;

        // Graph dimensions
        const graphHeight = 100;
        const graphWidth = pageWidth - (margin * 2);
        const startX = margin;
        const startY = y;
        const endY = startY + graphHeight;

        // Draw Axes
        doc.setDrawColor(100);
        doc.setLineWidth(1);
        doc.line(startX, endY, startX + graphWidth, endY); // X Axis
        doc.line(startX, startY, startX, endY); // Y Axis

        // Labels
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("0%", startX - 10, endY);
        doc.text("100%", startX - 20, startY + 5);
        doc.text("CYCLES", startX + graphWidth - 20, endY + 10);

        // Draw Grid Lines (Horizontal only for readability)
        doc.setDrawColor(200, 200, 200); // Light gray
        (doc as any).setLineDash([2, 2], 0);
        doc.line(startX, startY + (graphHeight / 2), startX + graphWidth, startY + (graphHeight / 2)); // 50% line
        (doc as any).setLineDash([], 0); // Reset dash

        // Draw Data Line
        doc.setDrawColor(255, 0, 0); // Red Line
        doc.setLineWidth(1.5);

        const stepX = graphWidth / (threatHistory.length - 1);

        for (let i = 0; i < threatHistory.length - 1; i++) {
            const val1 = threatHistory[i];
            const val2 = threatHistory[i + 1];

            const x1 = startX + (i * stepX);
            const y1 = endY - ((val1 / 100) * graphHeight);

            const x2 = startX + ((i + 1) * stepX);
            const y2 = endY - ((val2 / 100) * graphHeight);

            doc.line(x1, y1, x2, y2);

            // Draw points
            doc.setFillColor(255, 0, 0);
            doc.circle(x1, y1, 1.5, 'F');
        }
        // Last point
        const finalVal = threatHistory[threatHistory.length - 1];
        const finalX = startX + graphWidth;
        const finalY = endY - ((finalVal / 100) * graphHeight);
        doc.circle(finalX, finalY, 1.5, 'F');

    }

    // Save
    doc.save(`SKYIA_FULL_REPORT_${result}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
