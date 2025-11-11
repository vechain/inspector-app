<template>
    <div class="modal-card modern-import-type-modal" style="width: 100%;">
        <header class="modal-card-head modern-header">
            <div class="header-content">
                <div class="header-icon-wrapper">
                    <b-icon icon="upload" size="is-medium"></b-icon>
                </div>
                <div class="header-text">
                    <h1 class="modal-title">Choose Import Type</h1>
                    <p class="modal-subtitle">How would you like to import your contracts?</p>
                </div>
            </div>
        </header>
        <section class="modal-card-body modern-body">
            <!-- Selection Buttons Grid -->
            <div class="selection-grid">
                <button class="import-option-card" @click="$emit('select-files')">
                    <div class="option-icon-wrapper">
                        <b-icon icon="file" size="is-medium"></b-icon>
                    </div>
                    <div class="option-text">
                        <h3>Select Files</h3>
                        <p>Import individual contract files (.json)</p>
                    </div>
                </button>

                <button class="import-option-card" @click="$emit('select-folder')">
                    <div class="option-icon-wrapper">
                        <b-icon icon="folder-open" size="is-medium"></b-icon>
                    </div>
                    <div class="option-text">
                        <h3>Select Folder</h3>
                        <p>Import all contracts from a folder</p>
                    </div>
                </button>

                <button class="import-option-card" @click="$emit('select-builtin')">
                    <div class="option-icon-wrapper">
                        <b-icon icon="database" size="is-medium"></b-icon>
                    </div>
                    <div class="option-text">
                        <h3>Built-in Contracts</h3>
                        <p>VeChain contracts (VTHO, B3TR, etc.)</p>
                    </div>
                </button>
            </div>

            <!-- Divider -->
            <div class="divider-section">
                <div class="divider-line"></div>
                <span class="divider-text">or drag and drop</span>
                <div class="divider-line"></div>
            </div>

            <!-- Dropzone -->
            <div 
                class="dropzone"
                :class="{ 'is-dragging': isDragging }"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @drop.prevent="handleDrop"
            >
                <div class="dropzone-content">
                    <div class="dropzone-icon">
                        <b-icon icon="upload" size="is-medium"></b-icon>
                    </div>
                    <div class="dropzone-text">
                        <p class="dropzone-title">Drop files or folders here</p>
                        <p class="dropzone-subtitle">Supports JSON files (.json) and contract folders</p>
                    </div>
                </div>
            </div>

            <!-- Info Message -->
            <div class="info-message">
                <b-icon icon="lightbulb" size="is-small"></b-icon>
                <p>
                    <strong>Tip:</strong> You can import multiple files or an entire contracts folder. 
                    Only valid JSON files (.json) will be processed.
                </p>
            </div>
        </section>
        <footer class="modal-card-foot modern-footer">
            <button class="button is-outlined" type="button" @click="$emit('cancel')">Cancel</button>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

// TypeScript declarations for FileSystem API
interface FileSystemEntry {
    isFile: boolean
    isDirectory: boolean
    name: string
}

interface FileSystemFileEntry extends FileSystemEntry {
    file(successCallback: (file: File) => void, errorCallback?: (error: any) => void): void
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
    createReader(): FileSystemDirectoryReader
}

interface FileSystemDirectoryReader {
    readEntries(
        successCallback: (entries: FileSystemEntry[]) => void,
        errorCallback?: (error: any) => void
    ): void
}

@Component
export default class ImportTypeModal extends Vue {
    private isDragging = false

    private handleDragOver() {
        this.isDragging = true
    }

    private handleDragLeave(e: DragEvent) {
        const relatedTarget = e.relatedTarget as HTMLElement
        if (!relatedTarget || !relatedTarget.closest('.dropzone')) {
            this.isDragging = false
        }
    }

    private async handleDrop(e: DragEvent) {
        this.isDragging = false
        
        const items = e.dataTransfer?.items
        
        if (!items || items.length === 0) {
            console.log('No items in drop event')
            return
        }

        console.log('Items dropped:', items.length)

        // Collect all files (including from folders)
        const allFiles: File[] = []
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const entry = item.webkitGetAsEntry?.()
            
            if (!entry) {
                // Fallback: just get the file directly
                const file = item.getAsFile()
                if (file) {
                    allFiles.push(file)
                }
                continue
            }

            console.log('Processing entry:', entry.name, 'isDirectory:', entry.isDirectory)

            if (entry.isDirectory) {
                // Recursively read all files from the directory
                const dirFiles = await this.readDirectoryRecursively(entry as FileSystemDirectoryEntry)
                allFiles.push(...dirFiles)
            } else if (entry.isFile) {
                // It's a file
                const file = await this.readFileEntry(entry as FileSystemFileEntry)
                if (file) {
                    allFiles.push(file)
                }
            }
        }

        console.log('Total files collected:', allFiles.length)

        if (allFiles.length === 0) {
            return
        }

        // Check if we got files from a folder
        const hasFolder = items.length > 0 && items[0].webkitGetAsEntry?.()?.isDirectory
        
        // Emit files with flag indicating if from folder
        this.$emit('files-dropped', { files: allFiles, isFromFolder: hasFolder })
    }

    private async readFileEntry(fileEntry: FileSystemFileEntry): Promise<File | null> {
        return new Promise((resolve) => {
            fileEntry.file(
                (file: File) => resolve(file),
                (error: any) => {
                    console.error('Error reading file entry:', error)
                    resolve(null)
                }
            )
        })
    }

    private async readDirectoryRecursively(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
        const files: File[] = []
        
        const reader = dirEntry.createReader()
        
        // Read all entries in the directory
        const entries = await new Promise<FileSystemEntry[]>((resolve) => {
            const allEntries: FileSystemEntry[] = []
            
            const readBatch = () => {
                reader.readEntries(
                    (entries: FileSystemEntry[]) => {
                        if (entries.length === 0) {
                            resolve(allEntries)
                        } else {
                            allEntries.push(...entries)
                            readBatch() // Read next batch
                        }
                    },
                    (error: any) => {
                        console.error('Error reading directory:', error)
                        resolve(allEntries)
                    }
                )
            }
            
            readBatch()
        })

        // Process all entries
        for (const entry of entries) {
            if (entry.isFile) {
                const file = await this.readFileEntry(entry as FileSystemFileEntry)
                if (file) {
                    files.push(file)
                }
            } else if (entry.isDirectory) {
                // Recursively read subdirectories
                const subFiles = await this.readDirectoryRecursively(entry as FileSystemDirectoryEntry)
                files.push(...subFiles)
            }
        }

        return files
    }
}
</script>

<style lang="scss" scoped>
.modern-import-type-modal {
    border-radius: 12px;
    overflow: hidden;
}

.modern-header {
    background: linear-gradient(135deg, var(--modal-card-head-background) 0%, var(--body-background-alt) 100%);
    border-bottom: 1px solid var(--border-color);
    padding: 2rem 1.5rem;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: var(--primary-color);
    color: var(--primary-invert);
    border-radius: 10px;
    flex-shrink: 0;
}

.header-text {
    flex: 1;
    min-width: 0;
}

.modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color-strong);
    line-height: 1.2;
}

.modal-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-light);
    margin-top: 0.25rem;
}

.modern-body {
    padding: 2rem 1.5rem;
}

// Selection Grid
.selection-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.import-option-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--card-background);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
    
    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, var(--primary-color) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(50, 115, 220, 0.15);
        
        &::before {
            opacity: 0.05;
        }
        
        .option-icon-wrapper {
            background: var(--primary-color);
            color: var(--primary-invert);
        }
    }
}

.option-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    background: rgba(50, 115, 220, 0.1);
    color: var(--primary-color);
    border-radius: 10px;
    transition: all 0.3s ease;
}

.option-text {
    text-align: center;
    position: relative;
    z-index: 1;
    
    h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-color-strong);
        margin: 0 0 0.25rem 0;
    }
    
    p {
        font-size: 0.8125rem;
        color: var(--text-color-light);
        margin: 0;
    }
}

// Divider
.divider-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0;
}

.divider-line {
    flex: 1;
    height: 1px;
    background: var(--border-color);
}

.divider-text {
    font-size: 0.875rem;
    color: var(--text-color-light);
}

// Dropzone
.dropzone {
    position: relative;
    padding: 2rem;
    border: 2px dashed var(--border-color);
    border-radius: 12px;
    background: var(--body-background-alt);
    transition: all 0.2s ease;
    margin-bottom: 1.5rem;
    
    &:hover {
        border-color: var(--text-color-light);
        background: var(--card-background);
    }
    
    &.is-dragging {
        border-color: var(--primary-color);
        background: rgba(50, 115, 220, 0.05);
        
        .dropzone-icon {
            background: var(--primary-color);
            
            .icon {
                color: var(--primary-invert);
            }
        }
        
        .dropzone-title {
            color: var(--primary-color);
        }
    }
}

.dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
}

.dropzone-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    background: var(--body-background-alt);
    border-radius: 10px;
    transition: all 0.2s ease;
    
    .icon {
        color: var(--text-color-light);
    }
}

.dropzone-text {
    text-align: center;
}

.dropzone-title {
    font-weight: 500;
    color: var(--text-color-strong);
    margin: 0 0 0.25rem 0;
    transition: color 0.2s ease;
}

.dropzone-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-light);
    margin: 0;
}

// Info Message
.info-message {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(50, 115, 220, 0.05);
    border: 1px solid rgba(50, 115, 220, 0.15);
    border-radius: 8px;
    
    .icon {
        flex-shrink: 0;
        color: var(--primary-color);
        margin-top: 0.125rem;
    }
    
    p {
        font-size: 0.875rem;
        color: var(--text-color);
        margin: 0;
        
        strong {
            color: var(--text-color-strong);
        }
    }
}

[data-theme="dark"] .info-message {
    background: rgba(74, 158, 255, 0.1);
    border-color: rgba(74, 158, 255, 0.2);
}

.modern-footer {
    display: flex;
    justify-content: flex-start;
    padding: 1rem 1.5rem;
    background: var(--modal-card-foot-background);
    border-top: 1px solid var(--border-color);
}
</style>

