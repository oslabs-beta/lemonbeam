// Guide section definitions.

type GuideSectionId = "overview" | "setup" | "running" | "structure" | "testing";

type GuideSection = {
    id: GuideSectionId;
    title: string;
};

const GUIDE_SECTIONS: GuideSection[] = [
    { id: "overview", title: "Project Overview" },
    { id: "setup", title: "Setup / Installation" },
    { id: "running", title: "Running Locally" },
    { id: "structure", title: "Project Structure" },
    { id: "testing", title: "Testing" },
];

export { GUIDE_SECTIONS };
export type { GuideSectionId, GuideSection };
