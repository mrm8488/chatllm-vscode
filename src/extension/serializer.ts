import * as vscode from 'vscode';

export class ChatLLMNotebookSerializer implements vscode.NotebookSerializer {
  
    async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        if (content.length === 0) {
            // When the file is new or empty, return a new NotebookData with no cells
            return new vscode.NotebookData([]);
        }
        
        const text = new TextDecoder().decode(content);
        let data: any;
        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error('Error parsing JSON notebook content:', error);
            // Handle invalid JSON by returning an empty NotebookData or notifying the user
            return new vscode.NotebookData([]);
        }
    
        // Convert parsed data into NotebookData, including cell outputs
        const cells = data.cells.map((cell: any) => {
            const cellData = new vscode.NotebookCellData(
                cell.kind,
                cell.value,
                cell.languageId
                );
            cellData.metadata = {};
            if (cell.model) {
                cellData.metadata.model = cell.model;
            }
            if (cell.tokens) {
                cellData.metadata.tokens = cell.tokens;
            }
            
                
            if (cell.outputs) {
                cellData.outputs = cell.outputs.map((output: any) => {
                    const outputItems = output.items.map((item: any) => {
                        // Assume text-based outputs are stored as strings; binary outputs need special handling
                        let data = new TextEncoder().encode(item.data);
                        return new vscode.NotebookCellOutputItem(data, item.mime);
                    });
                    return new vscode.NotebookCellOutput(outputItems);
                });
            }
            
            return cellData;
        });
        return new vscode.NotebookData(cells);
    }

    async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
        const content = {
            cells: data.cells.map(cell => ({
                kind: cell.kind,
                value: cell.value,
                languageId: cell.languageId,
                outputs: cell.outputs?.map(output => ({
                    items: output.items.map(item => {
                        // Determine how to serialize based on MIME type
                        let serializedData = new TextDecoder().decode(item.data);
                        return { data: serializedData, mime: item.mime };
                    })
                })),
                ...(cell.metadata?.model !== undefined && {model:cell.metadata.model}),
                ...(cell.metadata?.tokens !== undefined && {tokens:cell.metadata.tokens})
            }))
        };
        
        return new TextEncoder().encode(JSON.stringify(content, null, 2));
    }
}