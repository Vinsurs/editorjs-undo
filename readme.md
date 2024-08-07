# editorjs-undo
A simple undo/redo plugin for [Editorjs](https://editorjs.io/)

## Usage
```js
import Undo from 'editorjs-undo';

const undo = new Undo({
    editor: editor,
});
// Optional initial data
const initialData = {blocks: []}
undo.initialize(initialData)
```

## License
MIT