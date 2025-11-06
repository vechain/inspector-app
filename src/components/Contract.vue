<template>
    <!-- List View (new UI) -->
    <div 
        v-if="variant === 'list'" 
        class="contract-card" 
        :class="{'is-dragging': isDragging}"
        draggable="true"
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
        @click="handleCardClick"
    >
        <!-- Header -->
        <div class="contract-header">
            <div class="contract-info">
                <div class="contract-avatar">
                    <img v-ident="item.address" alt="Contract avatar" />
                </div>
                <div class="contract-details">
                    <h4 class="contract-name">{{item.name || ''}}</h4>
                    <p class="contract-address is-family-monospace">{{item.address | toChecksumAddress | addr}}</p>
                </div>
            </div>

            <!-- 3-dots menu (visible on hover) -->
            <div class="dropdown is-right more-menu" :class="{'is-active': isMenuOpen}" @click.stop>
                <div class="dropdown-trigger">
                    <button 
                        class="button is-small is-ghost more-button" 
                        @click="toggleMenu"
                        aria-haspopup="true"
                    >
                        <b-icon icon="ellipsis-v" size="is-small"></b-icon>
                    </button>
                </div>
                <div class="dropdown-menu">
                    <div class="dropdown-content">
                        <a class="dropdown-item" @click="handleEdit">
                            <b-icon icon="edit" size="is-small"></b-icon>
                            <span>Edit</span>
                        </a>
                        <a class="dropdown-item" @click="handleCopyAddress">
                            <b-icon icon="copy" size="is-small"></b-icon>
                            <span>Copy Address</span>
                        </a>
                        <a class="dropdown-item" @click="handleExport">
                            <b-icon icon="file-export" size="is-small"></b-icon>
                            <span>Export</span>
                        </a>
                        <hr class="dropdown-divider">
                        <a class="dropdown-item has-text-danger" @click="handleDelete">
                            <b-icon icon="trash-alt" size="is-small"></b-icon>
                            <span>Delete</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="contract-actions">
            <button class="button is-small is-outlined action-edit" @click.stop="handleView">
                <b-icon icon="eye" size="is-small"></b-icon>
                <span>View</span>
            </button>
        </div>
    </div>

    <!-- Detail View (old UI with 3-dots menu) -->
    <div v-else class="box detail-box" :class="{'img-hover': $listeners.select}">
        <article class="media">
            <div class="media-left">
                <figure :class="{'could-hover': $listeners.select}" class="image is-64x64">
                    <img @click.stop="$emit('select')" v-ident="item.address" alt="Image" />
                </figure>
            </div>
            <div class="media-content">
                <div class="content">
                    <p>
                        <strong>{{item.name || ''}}</strong>
                    </p>
                    <p
                        class="is-family-monospace has-text-weight-semibold display-6"
                        v-if="isShort"
                    >{{item.address | toChecksumAddress | addr}}</p>
                    <p class="is-family-monospace has-text-weight-semibold display-6" v-else>
                        <a
                            target="_blank"
                            :href="`${$explorerAccount}${item.address}`"
                        >{{item.address | toChecksumAddress}}</a>
                    </p>
                </div>
                <nav class="level">
                    <div class="level-left">
                        <div class="level-item">
                            <slot />
                        </div>
                    </div>
                </nav>
            </div>
            <div class="media-right">
                <div class="content">
                    <!-- 3-dots menu for detail view -->
                    <div class="dropdown is-right detail-more-menu" :class="{'is-active': isMenuOpen}" @click.stop>
                        <div class="dropdown-trigger">
                            <button 
                                class="button is-small is-ghost" 
                                @click="toggleMenu"
                                aria-haspopup="true"
                            >
                                <b-icon icon="ellipsis-v" size="is-small"></b-icon>
                            </button>
                        </div>
                        <div class="dropdown-menu">
                            <div class="dropdown-content">
                                <a class="dropdown-item" @click="handleEdit">
                                    <b-icon icon="edit" size="is-small"></b-icon>
                                    <span>Edit</span>
                                </a>
                                <a class="dropdown-item" @click="handleCopyAddress">
                                    <b-icon icon="copy" size="is-small"></b-icon>
                                    <span>Copy Address</span>
                                </a>
                                <a class="dropdown-item" @click="handleExport">
                                    <b-icon icon="file-export" size="is-small"></b-icon>
                                    <span>Export</span>
                                </a>
                                <a class="dropdown-item" @click="handleSubmitABI">
                                    <b-icon icon="upload" size="is-small"></b-icon>
                                    <span>Submit JSON ABI</span>
                                </a>
                                <hr class="dropdown-divider">
                                <a class="dropdown-item has-text-danger" @click="handleDelete">
                                    <b-icon icon="trash-alt" size="is-small"></b-icon>
                                    <span>Delete</span>
                                </a>
                            </div>
                        </div>
                    </div>
                    <slot name="right" />
                </div>
            </div>
        </article>
    </div>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class Contract extends Vue {
    @Prop()
    private item!: Contract.Item

    @Prop({ default: 'detail' })
    private variant!: 'list' | 'detail'

    @Prop({ default: true })
    private isShort!: boolean

    private isMenuOpen = false
    private isDragging = false

    handleCardClick() {
        this.$emit('select')
    }

    handleEdit() {
        this.isMenuOpen = false
        this.$emit('edit')
    }

    handleView() {
        this.$emit('select')
    }

    handleCopyAddress() {
        this.isMenuOpen = false
        const address = this.item.address
        
        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(address).then(() => {
                this.$buefy.toast.open({
                    message: 'Address copied to clipboard!',
                    type: 'is-success',
                    duration: 2000,
                    position: 'is-bottom'
                })
            }).catch(() => {
                // Fallback
                this.fallbackCopyToClipboard(address)
            })
        } else {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(address)
        }
    }

    fallbackCopyToClipboard(text: string) {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        try {
            document.execCommand('copy')
            this.$buefy.toast.open({
                message: 'Address copied to clipboard!',
                type: 'is-success',
                duration: 2000,
                position: 'is-bottom'
            })
        } catch (err) {
            this.$buefy.toast.open({
                message: 'Failed to copy address',
                type: 'is-danger',
                duration: 2000,
                position: 'is-bottom'
            })
        }
        document.body.removeChild(textArea)
    }

    handleExport() {
        this.isMenuOpen = false
        this.$emit('export')
    }

    handleDelete() {
        this.isMenuOpen = false
        this.$emit('delete')
    }

    handleSubmitABI() {
        this.isMenuOpen = false
        this.$emit('submitABI')
    }

    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen
    }

    handleDragStart(e: DragEvent) {
        this.isDragging = true
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: this.item.id,
                address: this.item.address
            }))
        }
        this.$emit('dragstart', this.item)
    }

    handleDragEnd(e: DragEvent) {
        this.isDragging = false
        this.$emit('dragend')
    }

    mounted() {
        // Close dropdown when clicking outside
        document.addEventListener('click', this.closeMenu)
    }

    beforeDestroy() {
        document.removeEventListener('click', this.closeMenu)
    }

    closeMenu() {
        this.isMenuOpen = false
    }
}
</script>
<style lang="css" scoped>
.contract-card {
    position: relative;
    overflow: visible;
    border: 1px solid #dbdbdb;
    border-radius: 8px;
    padding: 0.75rem;
    background: white;
    transition: all 0.2s ease;
    cursor: grab;
    margin: auto;
}

.contract-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    border-color: #3273dc;
}

.contract-card.is-dragging {
    opacity: 0.5;
    cursor: grabbing;
}

/* Header */
.contract-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.contract-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
}

.contract-avatar {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
}

.contract-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.contract-details {
    flex: 1;
    min-width: 0;
}

.contract-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #363636;
    margin: 0;
    margin-bottom: 0.125rem;
}

.contract-address {
    font-size: 0.6875rem;
    color: #7a7a7a;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 3-dots menu */
.more-menu {
    opacity: 1;
    transition: opacity 0.2s ease;
    position: relative;
    z-index: 10;
}

.contract-card:hover .more-menu,
.more-menu.is-active {
    opacity: 1;
}

.more-button {
    border: none;
    background: transparent;
    padding: 0.25rem 0.5rem;
}

.more-button:hover {
    background: #f5f5f5;
    border-radius: 4px;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 20;
    min-width: 160px;
    padding-top: 4px;
    display: none;
}

.dropdown.is-active .dropdown-menu {
    display: block;
}

.dropdown-content {
    background-color: white;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: 0.5rem 0;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.dropdown-item:hover {
    background-color: #f5f5f5;
}

.dropdown-divider {
    margin: 0.5rem 0;
    border-top: 1px solid #ededed;
}

/* Actions */
.contract-actions {
    display: flex;
    gap: 0.5rem;
}

.action-edit {
    flex: 1;
    justify-content: center;
}

.contract-actions .button {
    font-size: 0.75rem;
}

.contract-actions .button:not(:disabled):hover {
    border-color: #3273dc;
    color: #3273dc;
}

/* Detail View (old UI) styles */
.detail-box {
    margin: auto;
}

.detail-box .image img {
    border-radius: 3px;
}

.img-hover .could-hover {
    cursor: pointer;
    transition: filter 0.2s ease-in-out;
}

.img-hover:hover .could-hover {
    filter: brightness(1.2);
}

.detail-more-menu {
    position: relative;
    z-index: 10;
}

.detail-more-menu .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 20;
    min-width: 160px;
    padding-top: 4px;
    display: none;
}

.detail-more-menu.is-active .dropdown-menu {
    display: block;
}

.detail-more-menu .dropdown-content {
    background-color: white;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: 0.5rem 0;
}

.detail-more-menu .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.detail-more-menu .dropdown-item:hover {
    background-color: #f5f5f5;
}

.detail-more-menu .dropdown-divider {
    margin: 0.5rem 0;
    border-top: 1px solid #ededed;
}
</style>

