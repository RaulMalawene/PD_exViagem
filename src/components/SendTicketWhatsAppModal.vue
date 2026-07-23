<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import flagMz from '../assets/flag_mz.svg'
import flagZa from '../assets/flag_southAfrica.png'

const props = defineProps({
  sending: { type: Boolean, default: false },
  plural: { type: Boolean, default: false },
})

const emit = defineEmits(['send', 'close'])

const countries = [
  { code: 'MZ', prefix: '+258', flag: flagMz, label: 'MZ +258' },
  { code: 'ZA', prefix: '+27', flag: flagZa, label: 'ZA +27' },
]

const phoneCountry = ref('MZ')
const phone = ref('')
const phoneOpen = ref(false)
const errorText = ref('')

function getPrefix(code) {
  return countries.find((c) => c.code === code)?.prefix ?? '+258'
}

function getFlag(code) {
  return countries.find((c) => c.code === code)?.flag ?? flagMz
}

function selectPhoneCountry(code) {
  phoneCountry.value = code
  phoneOpen.value = false
}

function handleOutsideClick() {
  phoneOpen.value = false
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))

function handleSend() {
  errorText.value = ''

  if (!phone.value.trim()) {
    errorText.value = 'Indique o seu número de WhatsApp.'
    return
  }

  emit('send', getPrefix(phoneCountry.value) + phone.value.trim())
}

function handleClose() {
  if (props.sending) return
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div class="overlay" @click.self="handleClose">
        <Transition name="sheet" appear>
          <div class="sheet">
            <div class="sheetHandle" />

            <div class="sheetIconWrap">
              <i class="fi fi-brands-whatsapp sheetIcon" />
            </div>

            <h2 class="sheetTitle">Enviar por WhatsApp</h2>
            <p class="sheetSub">
              O número usado na reserva pode não ter WhatsApp — confirme ou indique outro número para receber
              {{ plural ? 'os seus bilhetes' : 'o seu bilhete' }}.
            </p>

            <div class="field">
              <label class="fieldLabel">Número de WhatsApp</label>
              <div class="telWrap" :class="{ focused: phoneOpen }">
                <div class="telPrefix" @click.stop="phoneOpen = !phoneOpen">
                  <img :src="getFlag(phoneCountry)" alt="" class="flagIcon" />
                  <span class="prefixCode">{{ phoneCountry }} {{ getPrefix(phoneCountry) }}</span>
                  <i class="fi fi-rs-angle-small-down prefixChevron" :class="{ rotated: phoneOpen }" />
                  <Transition name="drop">
                    <ul v-if="phoneOpen" class="prefixDropdown" @click.stop>
                      <li v-for="c in countries" :key="c.code" class="prefixOption"
                          :class="{ active: phoneCountry === c.code }"
                          @click.stop="selectPhoneCountry(c.code)">
                        <img :src="c.flag" alt="" class="flagIcon" />
                        <span>{{ c.label }}</span>
                      </li>
                    </ul>
                  </Transition>
                </div>
                <input v-model="phone" type="tel" class="input telInput" placeholder="00 000 0000" />
              </div>
              <span v-if="errorText" class="errorMsg">{{ errorText }}</span>
            </div>

            <button class="sendBtn" :disabled="sending" @click="handleSend">
              <i class="fi fi-brands-whatsapp" />
              {{ sending ? 'A enviar...' : 'Enviar' }}
            </button>

            <button class="cancelBtn" :disabled="sending" @click="handleClose">Cancelar</button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 7000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 12px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.sheetHandle {
  width: 40px;
  height: 4px;
  border-radius: 4px;
  background: #E0E0E0;
  margin-bottom: 8px;
}

.sheetIconWrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #25D366;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.sheetIcon {
  font-size: 22px;
  color: #fff;
}

.sheetTitle {
  font-size: 18px;
  font-weight: 700;
  color: #221F20;
}

.sheetSub {
  font-size: 13px;
  color: #888;
  text-align: center;
  line-height: 1.5;
  max-width: 360px;
  margin-bottom: 8px;
}

.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.fieldLabel {
  font-size: 13px;
  font-weight: 600;
  color: #221F20;
}

.telWrap {
  display: flex;
  border: 1.5px solid #E0E0E0;
  border-radius: 10px;
  overflow: visible;
  transition: border-color 0.15s;
  background: #fff;
  position: relative;
}

.telWrap.focused,
.telWrap:focus-within {
  border-color: #25D366;
}

.telPrefix {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  background: #F6F6F6;
  border-right: 1.5px solid #E0E0E0;
  height: 48px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 9px 0 0 9px;
  position: relative;
  user-select: none;
  transition: background 0.15s;
}

.telPrefix:hover {
  background: #EEEEEE;
}

.flagIcon {
  width: 20px;
  height: 14px;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
}

.prefixCode {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.prefixChevron {
  font-size: 12px;
  color: #aaa;
  transition: transform 0.2s;
}

.prefixChevron.rotated {
  transform: rotate(180deg);
}

.prefixDropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1.5px solid #E0E0E0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 500;
  list-style: none;
  padding: 4px;
  min-width: 150px;
}

.prefixOption {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: #333;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.1s;
}

.prefixOption:hover {
  background: #F6F0F4;
}

.prefixOption.active {
  background: rgba(37, 211, 102, 0.1);
  color: #1da851;
  font-weight: 600;
}

.input {
  font-family: 'Ubuntu', sans-serif;
  color: #221F20;
  outline: none;
}

.telInput {
  border: none;
  border-radius: 0 9px 9px 0;
  flex: 1;
  min-width: 0;
  height: 46px;
  padding: 0 12px;
  font-size: 15px;
}

.errorMsg {
  font-size: 12px;
  color: #D94040;
  font-weight: 500;
}

.sendBtn {
  width: 100%;
  height: 50px;
  background: #25D366;
  color: #fff;
  border: none;
  border-radius: 50px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: 'Ubuntu', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.sendBtn:hover:not(:disabled) {
  opacity: 0.9;
}

.sendBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancelBtn {
  width: 100%;
  height: 44px;
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Ubuntu', sans-serif;
}

.cancelBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.25s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
