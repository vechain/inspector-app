<template>
    <div class="deploy-card">
        <div class="card-head">
            <h3 class="card-title">Deploy raw bytecode</h3>
            <p class="card-sub">Paste the contract's creation bytecode and (optionally) a VET amount sent to the constructor.</p>
        </div>

        <b-field
            :type="{ 'is-danger': errors.has('code') }"
            :message="errors.first('code')"
            label="Bytecode"
        >
            <b-input
                name="code"
                rows="10"
                v-validate="{ required: true, bytecode: true }"
                v-model.trim="code"
                type="textarea"
            />
        </b-field>

        <b-field
            :type="{ 'is-danger': errors.has('vet') }"
            :message="errors.first('vet')"
            label="VET sent to constructor (optional)"
        >
            <b-input
                v-model.trim="vet"
                v-validate="'vet'"
                placeholder="0"
                name="vet"
                type="text"
            />
        </b-field>

        <p class="value-readout">
            wei = <span class="mono">{{ numberValue }}</span>
            <span class="hex-aside">({{ haxValue }})</span>
        </p>

        <div class="actions">
            <button
                type="button"
                class="button is-rounded is-primary"
                :disabled="deploying"
                @click="deploy"
            >
                <b-icon v-if="deploying" icon="loading" custom-class="mdi-spin" size="is-small" />
                <span>{{ deploying ? 'Deploying…' : 'Deploy' }}</span>
            </button>
        </div>

        <DeploySuccessCard
            v-if="result"
            :address="result.address"
            :txid="result.txid"
            :abi="[]"
            :network="network"
            :existing-categories="existingCategories"
            @saved="onSaved"
            @dismiss="result = null"
        />
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import DeploySuccessCard from './DeploySuccessCard.vue'
import {
    buildRegularClause,
    signAndWait,
    isUserRejection,
    containsPush0,
} from '@/services/deploy-service'

interface DeployResult {
    address: string
    txid: string
}

@Component({ components: { DeploySuccessCard } })
export default class BytecodeMode extends Vue {
    @Prop({ required: true }) network!: string
    @Prop({ default: () => [] }) existingCategories!: string[]

    code = ''
    vet: number | null = null
    deploying = false
    result: DeployResult | null = null

    get haxValue(): string {
        const vet = BN(this.vet)
        if (!vet.isNaN() && !vet.isNegative()) {
            return '0x' + BN(vet.multipliedBy(1e18).toFixed(0)).toString(16)
        }
        return '0x0'
    }

    get numberValue(): string {
        const vet = BN(this.vet)
        if (!vet.isNaN() && !vet.isNegative()) {
            return vet.multipliedBy(1e18).toFixed(0)
        }
        return '0'
    }

    private async checkForm() {
        return await this.$validator.validateAll()
    }

    async deploy() {
        if (!(await this.checkForm())) return
        if (containsPush0(this.code)) {
            const ok = await this.confirm(
                'PUSH0 opcode detected',
                'This bytecode contains the PUSH0 (0x5f) opcode, which VeChain currently rejects. Deploy anyway?',
            )
            if (!ok) return
        }
        this.deploying = true
        this.result = null
        try {
            const clause = buildRegularClause(
                this.code,
                [],
                [],
                this.haxValue,
                'Inspector deploy contract',
            )
            const out = await signAndWait(
                (this as any).$connex,
                [clause],
                'Inspector deploy contract',
            )
            this.result = {
                address: out.contractAddresses[0],
                txid: out.txid,
            }
        } catch (err: any) {
            if (!isUserRejection(err)) {
                ;(this as any).$buefy.toast.open({
                    type: 'is-danger',
                    message: `${err.name || 'Error'}: ${err.message || err}`,
                    position: 'is-top',
                    duration: 4000,
                })
            }
        } finally {
            this.deploying = false
        }
    }

    onSaved() {
        // Card stays visible with the "Saved" state; nothing else to do.
    }

    private confirm(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            ;(this as any).$buefy.dialog.confirm({
                title,
                message,
                confirmText: 'Deploy anyway',
                cancelText: 'Cancel',
                type: 'is-warning',
                hasIcon: true,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            })
        })
    }
}
</script>

<style lang="scss" scoped>
.deploy-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
}
.card-head {
    margin-bottom: 1rem;
}
.card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0 0 0.25rem 0;
}
.card-sub {
    font-size: 0.82rem;
    color: var(--text-color-light);
    margin: 0;
}
.value-readout {
    font-size: 0.8rem;
    color: var(--text-color-light);
    margin: 0.25rem 0 0.75rem 0;
}
.mono {
    font-family: monospace;
}
.hex-aside {
    margin-left: 0.5rem;
    opacity: 0.7;
}
.actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;
}
</style>
