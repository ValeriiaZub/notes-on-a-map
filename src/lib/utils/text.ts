const mapNotes = [
    "Great spot",
    "Meet here",
    "Start point",
    "Avoid this",
    "Scenic view",
    "Check later",
    "Hidden path",
    "Camp here",
    "No signal",
    "Good food",
    "Rest stop",
    "Turn here",
    "Watch out",
    "Nice photo",
    "Park here",
    "Trailhead",
    "Quiet area",
    "Look up",
    "Shortcut",
    "Water here"
];

export function getRandomNote() {
    const randomIndex = Math.floor(Math.random() * mapNotes.length);
    return mapNotes[randomIndex];
}
