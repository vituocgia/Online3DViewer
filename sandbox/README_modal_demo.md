# 3D Viewer Modal Demo

This demo shows how to integrate the 3D viewer into a modal dialog with preselected objects and bidirectional communication.

## Files

- `modal_demo.html` - Main demo page with modal functionality
- `embed_full_website.html` - Updated 3D viewer that handles URL parameters
- `parent_example.html` - Simple example of parent-iframe communication

## Features

### 1. Preselection Support
- Pass preselected objects via URL parameters
- Automatically select objects when the 3D viewer loads
- Support for custom 3D model URLs

### 2. Bidirectional Communication
- **Parent → 3D Viewer**: Send preselected objects and model URLs
- **3D Viewer → Parent**: Send selected objects via postMessage
- **Parent → 3D Viewer**: Request current selection

### 3. Modal Interface
- Full-screen modal with 3D viewer
- Real-time selection display
- Selection history tracking
- Status updates

## How to Use

### Basic Usage

1. Open `modal_demo.html` in a web browser
2. Enter preselected objects (comma-separated)
3. Optionally enter a 3D model URL
4. Click "Open 3D Viewer Modal"
5. Select objects in the 3D viewer
6. View selections in real-time

### URL Parameters

The modal supports these URL parameters:

- `model` - URL of the 3D model to load
- `selected` - Comma-separated list of object names to preselect

Example:
```
embed_full_website.html#model=https://example.com/model.glb$selected=Object1,Object2,Object3
```

### Integration in Your Application

```javascript
// Open modal with preselected objects
function openViewerWithPreselection(objects, modelUrl) {
    const iframe = document.getElementById('viewerIframe');
    const params = new URLSearchParams();

    if (modelUrl) {
        params.append('model', modelUrl);
    }

    if (objects.length > 0) {
        params.append('selected', objects.join(','));
    }

    const url = 'embed_full_website.html?' + params.toString();
    iframe.src = url;
}

// Listen for selections from 3D viewer
window.addEventListener('message', (event) => {
    if (event.data.type === '3dviewer_selection_changed') {
        const selectedObjects = event.data.selectedObjects;
        console.log('Selected objects:', selectedObjects);
        // Handle the selection in your application
    }
});

// Request current selection
function requestSelection() {
    const iframe = document.getElementById('viewerIframe');
    iframe.contentWindow.postMessage({
        type: 'request_selection'
    }, '*');
}
```

## Message Types

### From 3D Viewer to Parent
- `3dviewer_selection_changed` - Selection has changed
  - `selectedObjects` - Array of selected object names
  - `selectedCount` - Number of selected objects
- `3dviewer_loaded` - Model has been loaded
  - `modelUrl` - URL of the loaded model
- `3dviewer_error` - Error occurred
  - `message` - Error message

### From Parent to 3D Viewer
- `request_selection` - Request current selection

## Browser Compatibility

- Modern browsers with ES6 module support
- postMessage API for iframe communication
- File API for drag-and-drop support

## Troubleshooting

### Common Issues

1. **3D viewer not loading**: Check browser console for errors
2. **Preselection not working**: Ensure object names match exactly
3. **Communication not working**: Verify same-origin policy
4. **Model not loading**: Check CORS settings for external models

### Debug Mode

Open browser developer tools and check:
- Console for JavaScript errors
- Network tab for failed requests
- Application tab for localStorage/cookies

## Customization

### Styling
Modify the CSS in `modal_demo.html` to match your application's design.

### Functionality
Extend the JavaScript functions to add custom features like:
- Custom selection handling
- Additional UI controls
- Integration with your data model

### 3D Viewer Features
The embedded 3D viewer supports all standard features:
- Multiple file formats
- Camera controls
- Object selection
- Material editing
- Export functionality
