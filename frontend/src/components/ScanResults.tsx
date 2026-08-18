import { useState } from "react";

// Define the shape of the props accepted by the ScanResults component
interface ScanResultsProps {
    guideMarkdown: string;
}

function ScanResults({ guideMarkdown }: ScanResultsProps) {
  // State to track whether the markdown content has been successfully copied to the clipboard
    const [copied, setCopied] = useState<boolean>(false);

    // Function to handle copying the markdown text to the user's system clipboard
    const handleCopy = async (): Promise<void> => {
        try {
        await navigator.clipboard.writeText(guideMarkdown);
        setCopied(true);
        // Revert the "Copied!" confirmation message back to "Copy" after 2 seconds
        setTimeout(() => setCopied(false), 2000);
        } catch (error) {
        console.error("Failed to copy text: ", error);
        }
    };

    // Function to handle packaging the markdown string into a downloadable .md file
    const handleDownload = (): void => {
        // Create a Blob containing the markdown content as a UTF-8 text file
        const blob = new Blob([guideMarkdown], {
        type: "text/markdown;charset=utf-8",
        });
        // Generate a temporary object URL pointing to the Blob
        const url = URL.createObjectURL(blob);
        // Create a temporary anchor element to trigger the download programmatically
        const link = document.createElement("a");
        link.href = url;
        link.download = "guide.md";
        document.body.appendChild(link);
        link.click(); // Programmatically click the link to start downloading
        document.body.removeChild(link); // Clean up the DOM node
        URL.revokeObjectURL(url); // Free up browser memory by releasing the object URL
    };

    return (
        // Outer container card holding the generated guide output and action buttons
        <div className="mt-8 w-full max-w-4xl text-left rounded-xl border border-white/10 bg-white/5 p-6 shadow-xl">
        {/* Header section with title and action buttons */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-yellow)]">
            Generated Guide
            </h2>
            <div className="flex gap-3">
            {/* Copy to clipboard button with dynamic label feedback */}
            <button
                onClick={handleCopy}
                className="rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
                {copied ? "Copied! ✓" : "Copy"}
            </button>
            {/* Download button to export text as a .md file */}
            <button
                onClick={handleDownload}
                className="rounded-lg bg-[var(--color-yellow)] px-3.5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
            >
                Download .md
            </button>
            </div>
        </div>

        {/* Scrollable container displaying the preformatted markdown code content */}
        <pre className="max-h-[600px] overflow-y-auto whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed bg-black/30 p-4 rounded-lg border border-white/5">
            {guideMarkdown}
        </pre>
        </div>
    );
}

export default ScanResults;
