# Dead Ends Log

| Iteration | Approach Tried | Why It Failed | Files Touched |
|-----------|---------------|---------------|---------------|
| M1-Iter1 | Passing zero-copy Uint8Array view (`new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)`) to `unpdf.extractText` | Mozilla PDF.js inside unpdf detaches the underlying ArrayBuffer during worker processing, zeroing the caller's Buffer to 0 bytes and breaking buffer reuse | `src/services/pdf/adapters/unpdf-adapter.js` |
| M1-Iter1 | Relying on default parameter `options = {}` without normalizing `null` | Passing explicit `null` throws `TypeError: Cannot read properties of null (reading 'adapter')` | `src/services/pdf/pdf-extractor.js` |
| M1-Iter1 | `typeof options.contextBefore === 'number'` for context window options | In JavaScript `typeof NaN === 'number'`; passing `NaN` turns interval bounds to `NaN` and drops all matched sentences | `src/services/pdf/pdf-extractor.js` |
