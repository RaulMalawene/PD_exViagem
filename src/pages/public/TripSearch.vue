<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePublicBookingStore } from '../../stores/publicBookingStore'
import DatePicker from '../../components/DatePicker.vue'

const router = useRouter()
const bookingStore = usePublicBookingStore()

const selectedRoute = ref('')
const selectedDate = ref('')
const routeOpen = ref(false)
const dateOpen = ref(false)

const today = new Date().toISOString().split('T')[0]

const selectedRouteLabel = computed(() => {
    const match = bookingStore.routes.find((r) => String(r.id) === String(selectedRoute.value))
    return match?.name ?? 'Selecione a rota'
})

const formattedDate = computed(() => {
    if (!selectedDate.value) return 'Todas as datas (opcional)'
    const [y, m, d] = selectedDate.value.split('-')
    return `${d}/${m}/${y}`
})

function selectRoute(id) {
    selectedRoute.value = id
    routeOpen.value = false
}

function search() {
    if (!selectedRoute.value) return
    router.push({
        path: '/booking/results',
        query: {
            route_id: selectedRoute.value,
            ...(selectedDate.value ? { date: selectedDate.value } : {}),
        },
    })
}

function closeAll() {
    routeOpen.value = false
    dateOpen.value = false
}

onMounted(async () => {
    document.addEventListener('click', closeAll)
    await bookingStore.fetchRoutes()
    if (!selectedRoute.value && bookingStore.routes.length) {
        selectedRoute.value = String(bookingStore.routes[0].id)
    }
})
onUnmounted(() => document.removeEventListener('click', closeAll))
</script>

<template>
    <div class="page">

        <!-- HERO -->
        <section class="hero">
            <div class="heroInner">
                <span class="heroPill">Viaje com a Portador Diário</span>
                <h1 class="heroTitle">Reserve a sua viagem</h1>
                <p class="heroSub">Maputo <span class="heroArrow">⇄</span> Johannesburg</p>
            </div>
        </section>

        <!-- SEARCH CARD -->
        <div class="cardWrap">
            <div class="searchCard">

                <div class="field">
                    <label class="fieldLabel">Rota</label>
                    <div class="customSelect" :class="{ open: routeOpen }" @click.stop="routeOpen = !routeOpen">
                        <i class="fi fi-rs-bus selectIcon" />
                        <span class="selectValue">{{ selectedRouteLabel }}</span>
                        <i class="fi fi-rs-angle-small-down chevron" :class="{ rotated: routeOpen }" />
                        <Transition name="dropdown">
                            <ul v-if="routeOpen" class="dropdownList">
                                <li v-for="r in bookingStore.routes" :key="r.id" class="dropdownItem"
                                    :class="{ active: String(selectedRoute) === String(r.id) }"
                                    @click.stop="selectRoute(String(r.id))">
                                    {{ r.name }}
                                </li>
                            </ul>
                        </Transition>
                    </div>
                </div>

                <div class="field">
                    <label class="fieldLabel">Data de viagem</label>
                    <div class="customSelect" :class="{ open: dateOpen }" @click.stop="dateOpen = !dateOpen">
                        <i class="fi fi-rs-calendar selectIcon" />
                        <span class="selectValue" :class="{ placeholder: !selectedDate }">{{ formattedDate }}</span>
                        <i class="fi fi-rs-angle-small-down chevron" :class="{ rotated: dateOpen }" />
                        <Transition name="dropdown">
                            <DatePicker v-if="dateOpen" v-model="selectedDate" :min="today" :route-id="selectedRoute"
                                @update:modelValue="dateOpen = false" />
                        </Transition>
                    </div>
                </div>

                <p class="scheduleNote">
                    Viagens: Seg, Qua (MZQ→JHB) | Qua, Sex (JHB→MZQ)
                </p>

                <button class="searchBtn" :class="{ disabled: !selectedRoute }" @click="search">
                    Pesquisar viagens
                </button>

            </div>
        </div>

        <!-- TRUST BADGES -->
        <div class="trust">
            <div class="trustInner">
                <div class="trustItem">
                    <i class="fi fi-rs-comment trustIcon" />
                    <span class="trustLabel">Bilhete por WhatsApp</span>
                </div>
                <div class="trustItem">
                    <i class="fi fi-rs-lock trustIcon" />
                    <span class="trustLabel">Pagamento seguro</span>
                </div>
                <div class="trustItem">
                    <i class="fi fi-rs-headset trustIcon" />
                    <span class="trustLabel">Suporte 24h</span>
                </div>
            </div>
        </div>

        <!-- FEATURE CARDS -->
        <div class="features">
            <div class="featuresInner">
                <div class="featureCard">
                    <div class="featureIconWrap">
                        <i class="fi fi-rs-bus featureIcon" />
                    </div>
                    <div class="featureText">
                        <span class="featureTitle">Frota Moderna</span>
                        <span class="featureDesc">Viaje com o máximo de conforto e segurança nos nossos novos
                            veículos.</span>
                    </div>
                </div>
                <div class="featureCard">
                    <div class="featureIconWrap">
                        <i class="fi fi-rs-shield-check featureIcon" />
                    </div>
                    <div class="featureText">
                        <span class="featureTitle">Viagem Segura</span>
                        <span class="featureDesc">Motoristas experientes e rotas verificadas para a sua
                            tranquilidade.</span>
                    </div>
                </div>
                <div class="featureCard">
                    <div class="featureIconWrap">
                        <i class="fi fi-rs-marker featureIcon" />
                    </div>
                    <div class="featureText">
                        <span class="featureTitle">Paragens Estratégicas</span>
                        <span class="featureDesc">Paragens em Matola, Ressano Garcia, Malelane e Alzuim.</span>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.page {
    min-height: 100vh;
    background: #F6F6F6;
    display: flex;
    flex-direction: column;
}

.hero {
    background: #0D0D2B;
    padding: 60px 24px 100px;
}

.heroInner {
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.heroPill {
    display: inline-block;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    padding: 6px 16px;
    border-radius: 50px;
}

.heroTitle {
    color: #fff;
    font-size: clamp(28px, 5vw, 48px);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
}

.heroSub {
    color: rgba(255, 255, 255, 0.7);
    font-size: 17px;
}

.heroArrow {
    color: #922877;
    font-weight: 700;
}

.cardWrap {
    max-width: 520px;
    width: 100%;
    margin: -60px auto 0;
    padding: 0 20px;
    position: relative;
    z-index: 10;
}

.searchCard {
    background: #fff;
    border-radius: 16px;
    padding: 28px 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.fieldLabel {
    font-size: 11px;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.customSelect {
    position: relative;
    display: flex;
    align-items: center;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    height: 52px;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s;
    user-select: none;
}

.customSelect.open {
    border-color: #922877;
}

.selectIcon {
    position: absolute;
    left: 14px;
    color: #922877;
    font-size: 16px;
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
}

.selectValue {
    flex: 1;
    padding: 0 44px;
    font-size: 15px;
    color: #221F20;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.selectValue.placeholder {
    color: #bbb;
}

.chevron {
    position: absolute;
    right: 14px;
    color: #aaa;
    font-size: 14px;
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
    transition: transform 0.2s;
}

.chevron.rotated {
    transform: translateY(-50%) rotate(180deg);
}

.dropdownList {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: #fff;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    overflow: hidden;
    z-index: 200;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    list-style: none;
    padding: 4px;
}

.dropdownItem {
    padding: 12px 14px;
    font-size: 14px;
    color: #333;
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.1s;
}

.dropdownItem:hover {
    background: #F6F0F4;
}

.dropdownItem.active {
    background: rgba(163, 32, 106, 0.08);
    color: #922877;
    font-weight: 600;
}

.scheduleNote {
    font-size: 12px;
    color: #aaa;
    font-style: italic;
    text-align: center;
    line-height: 1.5;
}

.searchBtn {
    width: 100%;
    height: 52px;
    background: #922877;
    color: #fff;
    border: none;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    font-family: 'Ubuntu', sans-serif;
    letter-spacing: 0.01em;
}

.searchBtn:hover:not(.disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
}

.searchBtn:active:not(.disabled) {
    transform: translateY(0);
}

.searchBtn.disabled {
    background: #ccc;
    cursor: not-allowed;
}

.trust {
    padding: 40px 24px 32px;
}

.trustInner {
    max-width: 520px;
    margin: 0 auto;
    display: flex;
    justify-content: space-around;
    gap: 16px;
}

.trustItem {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.trustIcon {
    font-size: 22px;
    color: #922877;
}

.trustLabel {
    font-size: 12px;
    color: #888;
    text-align: center;
    line-height: 1.4;
}

.features {
    padding: 0 20px 48px;
}

.featuresInner {
    max-width: 520px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.featureCard {
    background: #fff;
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid #F0E8ED;
}

.featureIconWrap {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(163, 32, 106, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.featureIcon {
    font-size: 18px;
    color: #922877;
    position: relative;
    top: 1px;
}

.featureText {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.featureTitle {
    font-size: 14px;
    font-weight: 700;
    color: #922877;
}

.featureDesc {
    font-size: 13px;
    color: #888;
    line-height: 1.45;
}

.dropdown-enter-active,
.dropdown-leave-active {
    transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

@media (min-width: 768px) {
    .hero {
        padding: 80px 24px 120px;
    }

    .cardWrap {
        max-width: 560px;
        margin-top: -80px;
    }

    .trust {
        padding: 48px 24px 36px;
    }

    .trustInner {
        max-width: 760px;
    }

    .features {
        padding: 0 24px 64px;
    }

    .featuresInner {
        max-width: 760px;
        flex-direction: row;
        gap: 16px;
    }

    .featureCard {
        flex: 1;
        min-width: calc(50% - 8px);
    }
}

@media (min-width: 1024px) {
    .hero {
        padding: 100px 40px 160px;
    }

    .heroTitle {
        font-size: 52px;
    }

    .cardWrap {
        max-width: 580px;
        margin-top: -100px;
        padding: 0;
    }

    .trust {
        padding: 56px 40px 40px;
    }

    .trustInner {
        max-width: 900px;
    }

    .features {
        padding: 0 40px 80px;
    }

    .featuresInner {
        max-width: 900px;
        flex-direction: row;
    }

    .featureCard {
        flex: 1;
        min-width: 0;
    }
}

@media (min-width: 1440px) {
    .hero {
        padding: 120px 40px 180px;
    }

    .heroTitle {
        font-size: 56px;
    }

    .cardWrap {
        max-width: 600px;
        margin-top: -110px;
    }

    .trustInner,
    .featuresInner {
        max-width: 960px;
    }
}
</style>