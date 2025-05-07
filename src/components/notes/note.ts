
export const noteStyle: React.CSSProperties = {
    width: '100px', // Adjust size
    height: '100px',
    backgroundColor: '#FFFACD', // LemonChiffon - adjust later
    boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
    padding: '8px',
    borderRadius: '4px',
    fontFamily: '"Permanent Marker", cursive', // Apply font
    fontSize: '12px', // Adjust font size
    lineHeight: '1.3',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Space out content and buttons
    alignItems: 'center', // Center content horizontally
    overflow: 'hidden', // Hide overflow
    position: 'relative', // Needed for absolute positioning of buttons
    wordBreak: 'break-word',
}