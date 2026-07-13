<script setup>
import TicketCard from './TicketCard.vue'

defineProps({
    booking: { type: Object, required: true },
    tripInfo: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close'])
</script>

<template>
    <Teleport to="body">
        <Transition name="overlay">
            <div class="overlay" @click.self="emit('close')">
                <Transition name="pop" appear>
                    <div class="cardWrap">

                        <!-- CLOSE -->
                        <button class="closeBtn" @click="emit('close')">
                            <i class="fi fi-br-cross" />
                        </button>

                        <TicketCard :booking="booking" :trip-info="tripInfo" />

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
    backdrop-filter: blur(6px);
    z-index: 5000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.cardWrap {
    width: 100%;
    max-width: 360px;
    position: relative;
}

.closeBtn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 28px;
    height: 28px;
    border: none;
    background: #F6F6F6;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #777;
    transition: background 0.15s;
    z-index: 1;
}

.closeBtn:hover {
    background: #EEEEEE;
}

/* TRANSITIONS */
.overlay-enter-active,
.overlay-leave-active {
    transition: opacity 0.2s;
}

.overlay-enter-from,
.overlay-leave-to {
    opacity: 0;
}

.pop-enter-active,
.pop-leave-active {
    transition: opacity 0.25s, transform 0.25s;
}

.pop-enter-from,
.pop-leave-to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
}
</style>
