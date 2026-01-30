<template>
  <div class="add-custom-role">
    <b-field
      label="Add Custom Role"
      :type="fieldType"
      :message="fieldMessage"
    >
      <b-input
        v-model="inputValue"
        placeholder="Enter role name (e.g., MY_CUSTOM_ROLE) or bytes32 hash (0x...)"
        @input="onInputChange"
      ></b-input>
    </b-field>
    <div v-if="showPreview" class="hash-preview">
      <span class="preview-label">{{ previewLabel }}:</span>
      <code class="preview-value">{{ previewValue }}</code>
    </div>
    <div class="add-button-container">
      <b-button
        type="is-primary"
        :disabled="!isValid"
        @click="onAdd"
      >
        Add Role
      </b-button>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { getRoleHash } from '@/contracts/access-control-roles'

@Component
export default class AddCustomRoleInput extends Vue {
  inputValue = ''
  computedHash = ''
  inputType: 'hash' | 'name' | 'none' = 'none'

  get isHashInput(): boolean {
    const trimmed = this.inputValue.trim()
    return trimmed.startsWith('0x') && trimmed.length === 66
  }

  get isValidHash(): boolean {
    const trimmed = this.inputValue.trim()
    if (!trimmed.startsWith('0x') || trimmed.length !== 66) {
      return false
    }
    // Check if all characters after 0x are valid hex
    const hexPart = trimmed.slice(2)
    return /^[0-9a-fA-F]+$/.test(hexPart)
  }

  get isValidName(): boolean {
    const trimmed = this.inputValue.trim()
    return trimmed.length > 0 && !trimmed.startsWith('0x')
  }

  get isValid(): boolean {
    if (this.inputValue.trim().length === 0) {
      return false
    }
    if (this.inputValue.trim().startsWith('0x')) {
      return this.isValidHash
    }
    return this.isValidName
  }

  get showPreview(): boolean {
    return this.inputValue.trim().length > 0 && this.isValid
  }

  get previewLabel(): string {
    return this.isHashInput ? 'Hash' : 'Computed hash'
  }

  get previewValue(): string {
    return this.computedHash
  }

  get fieldType(): string {
    if (this.inputValue.trim().length === 0) {
      return ''
    }
    if (!this.isValid) {
      return 'is-danger'
    }
    return 'is-success'
  }

  get fieldMessage(): string {
    const trimmed = this.inputValue.trim()
    if (trimmed.length === 0) {
      return ''
    }
    if (trimmed.startsWith('0x')) {
      if (trimmed.length !== 66) {
        return 'Hash must be 66 characters (0x + 64 hex chars)'
      }
      if (!this.isValidHash) {
        return 'Invalid hex characters in hash'
      }
      return 'Valid bytes32 hash'
    }
    return 'Role name will be hashed using keccak256'
  }

  onInputChange() {
    const trimmed = this.inputValue.trim()
    if (trimmed.length === 0) {
      this.inputType = 'none'
      this.computedHash = ''
      return
    }

    if (trimmed.startsWith('0x')) {
      this.inputType = 'hash'
      if (this.isValidHash) {
        this.computedHash = trimmed.toLowerCase()
      } else {
        this.computedHash = ''
      }
    } else {
      this.inputType = 'name'
      this.computedHash = getRoleHash(trimmed)
    }
  }

  onAdd() {
    if (!this.isValid) {
      return
    }

    const trimmed = this.inputValue.trim()
    let name: string
    let hash: string

    if (this.isHashInput) {
      // User provided a hash directly
      name = trimmed // Use the hash as the name placeholder
      hash = trimmed.toLowerCase()
    } else {
      // User provided a name
      name = trimmed
      hash = this.computedHash
    }

    this.$emit('add', { name, hash })
    this.inputValue = ''
    this.computedHash = ''
    this.inputType = 'none'
  }
}
</script>
<style lang="scss" scoped>
.add-custom-role {
  padding: 1rem;
  background-color: var(--bg-light, #f5f5f5);
  border-radius: 6px;
  margin-bottom: 1rem;

  .hash-preview {
    margin-top: 0.5rem;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background-color: var(--code-bg, #fff);
    border-radius: 4px;
    border: 1px solid var(--border-color, #e0e0e0);

    .preview-label {
      font-weight: 600;
      margin-right: 0.5rem;
      color: var(--text-color);
    }

    .preview-value {
      font-family: monospace;
      font-size: 0.85rem;
      word-break: break-all;
      color: var(--code-color, #333);
    }
  }

  .add-button-container {
    margin-top: 0.75rem;
  }
}

/* Dark mode support */
[data-theme="dark"] {
  .add-custom-role {
    background-color: #1a1a1a;

    .hash-preview {
      background-color: #2a2a2a;
      border-color: #444;

      .preview-value {
        color: #e0e0e0;
      }
    }
  }
}
</style>
