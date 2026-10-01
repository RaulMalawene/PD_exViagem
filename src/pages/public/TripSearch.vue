<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePublicBookingStore } from "../../stores/publicBookingStore";
import { parseApiError } from "../../utils/parseApiError";
import DatePicker from "../../components/DatePicker.vue";
import heroBg from "../../assets/hero-boarding.png";
import vanFleet from "../../assets/van-fleet.jpeg";
import LogoPD from "../../assets/LogoPD.svg";
import whatsappIcon from "../../assets/whatsapp.png";
import gmailIcon from "../../assets/gmail.png";
import ticketIcon from "../../assets/ticket.png";
import symbolLima from "../../assets/symbol-lima.svg";
import flagMz from "../../assets/flag_mz.svg";
import flagZa from "../../assets/flag_southAfrica.png";

const router = useRouter();
const bookingStore = usePublicBookingStore();

const loadingRoutes = ref(true);
const loadError = ref(null);

const selectedRoute = ref("");
const selectedDate = ref("");
const routeOpen = ref(false);
const dateOpen = ref(false);

const today = new Date().toISOString().split("T")[0];

const selectedRouteLabel = computed(() => {
  const match = bookingStore.routes.find(
    (r) => String(r.id) === String(selectedRoute.value),
  );
  return match?.name ?? "Selecione a rota";
});

const formattedDate = computed(() => {
  if (!selectedDate.value) return "Todas as datas (opcional)";
  const [y, m, d] = selectedDate.value.split("-");
  return `${d}/${m}/${y}`;
});

function selectRoute(id) {
  selectedRoute.value = id;
  routeOpen.value = false;
}

function search() {
  if (!selectedRoute.value) return;
  router.push({
    path: "/booking/results",
    query: {
      route_id: selectedRoute.value,
      ...(selectedDate.value ? { date: selectedDate.value } : {}),
    },
  });
}

const searchCardRef = ref(null);
const highlightSearch = ref(false);
let highlightTimer = null;

// Os CTAs de baixo da pagina levam o cliente ate ao cartao de pesquisa e
// realcam-no, em vez de pesquisarem as cegas com a rota que estiver selecionada.
function scrollToSearch() {
  searchCardRef.value?.scrollIntoView({ behavior: "smooth", block: "center" });
  highlightSearch.value = false;
  clearTimeout(highlightTimer);
  requestAnimationFrame(() => {
    highlightSearch.value = true;
    highlightTimer = setTimeout(() => (highlightSearch.value = false), 1600);
  });
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function closeAll() {
  routeOpen.value = false;
  dateOpen.value = false;
}

const whatsappUrl =
  "https://wa.me/258862051706?text=" +
  encodeURIComponent(
    "Olá, gostaria de ter mais informações sobre as viagens da Portador Diário.",
  );

function openWhatsApp() {
  window.open(whatsappUrl, "_blank");
}

onMounted(async () => {
  document.addEventListener("click", closeAll);
  // Chegar aqui e sempre o inicio de uma reserva nova (nunca um "voltar atras" dentro
  // de um fluxo em curso - isso vai para /booking/results) - limpa o estado da reserva
  // anterior para o token de sessao nao ser reaproveitado entre reservas diferentes.
  // startNewFlow tambem limpa a marca de "ja pago", para quem volta a
  // landing page poder fazer uma reserva nova.
  bookingStore.startNewFlow();
  await carregarRotas();
});

// Esta e a porta de entrada do cliente. Sem tratamento, uma API em baixo
// mostrava um dropdown vazio e o cliente concluia que nao havia viagens.
async function carregarRotas() {
  loadingRoutes.value = true;
  loadError.value = null;

  try {
    await bookingStore.fetchRoutes();

    if (!selectedRoute.value && bookingStore.routes.length) {
      selectedRoute.value = String(bookingStore.routes[0].id);
    }
  } catch (err) {
    loadError.value = parseApiError(err);
  } finally {
    loadingRoutes.value = false;
  }
}
onUnmounted(() => {
  document.removeEventListener("click", closeAll);
  clearTimeout(highlightTimer);
});
</script>

<template>
  <div class="page">
    <!-- HERO -->
    <section class="hero" :style="{ backgroundImage: `url(${heroBg})` }">
      <div class="heroOverlay" />
      <div class="heroInner">
        <span class="heroPill">Viaje com a Portador Diário</span>
        <h1 class="heroTitle">Reserve a sua viagem</h1>
        <p class="heroSub">
          Maputo <span class="heroArrow">⇄</span> Johannesburg
        </p>
      </div>
    </section>

    <!-- SEARCH CARD -->
    <div ref="searchCardRef" class="cardWrap">
      <div class="searchCard" :class="{ highlight: highlightSearch }">
        <div class="field">
          <label class="fieldLabel">Rota</label>
          <div
            class="customSelect"
            :class="{ open: routeOpen, disabled: loadingRoutes || loadError }"
            @click.stop="!loadingRoutes && !loadError && (routeOpen = !routeOpen)"
          >
            <i class="fi fi-rs-bus selectIcon" />
            <span v-if="loadingRoutes" class="selectValue muted">A carregar rotas...</span>
            <span v-else-if="loadError" class="selectValue muted">Rotas indisponíveis</span>
            <span v-else class="selectValue">{{ selectedRouteLabel }}</span>
            <i
              class="fi fi-rs-angle-small-down chevron"
              :class="{ rotated: routeOpen }"
            />
            <Transition name="dropdown">
              <ul v-if="routeOpen" class="dropdownList">
                <li
                  v-for="r in bookingStore.routes"
                  :key="r.id"
                  class="dropdownItem"
                  :class="{ active: String(selectedRoute) === String(r.id) }"
                  @click.stop="selectRoute(String(r.id))"
                >
                  {{ r.name }}
                </li>
              </ul>
            </Transition>
          </div>
        </div>

        <div v-if="loadError" class="searchError">
          <i class="fi fi-sr-exclamation" />
          <span>{{ loadError }}</span>
          <button class="searchRetry" @click.stop="carregarRotas">Voltar a tentar</button>
        </div>

        <div class="field">
          <label class="fieldLabel">Data de viagem</label>
          <div
            class="customSelect"
            :class="{ open: dateOpen }"
            @click.stop="dateOpen = !dateOpen"
          >
            <i class="fi fi-rs-calendar selectIcon" />
            <span class="selectValue" :class="{ placeholder: !selectedDate }">{{
              formattedDate
            }}</span>
            <i
              class="fi fi-rs-angle-small-down chevron"
              :class="{ rotated: dateOpen }"
            />
            <Transition name="dropdown">
              <DatePicker
                v-if="dateOpen"
                v-model="selectedDate"
                :min="today"
                :route-id="selectedRoute"
                @update:modelValue="dateOpen = false"
              />
            </Transition>
          </div>
        </div>

        <p class="scheduleNote">
          Viagens: Seg, Qua (MZQ→JHB) | Qua, Sex (JHB→MZQ)
        </p>

        <button
          class="searchBtn"
          :class="{ disabled: !selectedRoute }"
          @click="search"
        >
          Pesquisar viagens
        </button>
      </div>
    </div>

    <!-- TRUST BADGES -->
    <div class="trust">
      <div class="trustInner">
        <div class="trustItem">
          <span class="trustIconWrap brand">
            <img :src="whatsappIcon" alt="" class="trustImg" />
          </span>
          <span class="trustLabel">Bilhete por <strong>WhatsApp</strong></span>
        </div>
        <div class="trustItem">
          <span class="trustIconWrap">
            <i class="fi fi-rs-lock trustIcon" />
          </span>
          <span class="trustLabel">Pagamento <strong>seguro</strong></span>
        </div>
        <div class="trustItem">
          <span class="trustIconWrap">
            <i class="fi fi-rs-headset trustIcon" />
          </span>
          <span class="trustLabel">Suporte <strong>24h</strong></span>
        </div>
      </div>
    </div>

    <!-- COMO FUNCIONA -->
    <section id="como-funciona" class="howSection">
      <div class="sectionWrap">
        <p class="sectionTag">Simples e rápido</p>
        <h2 class="sectionTitle">Como funciona</h2>
        <p class="sectionDesc">
          Reserve o seu lugar em menos de 5 minutos, sem filas, sem
          complicações.
        </p>
        <div class="steps">
          <div class="step">
            <div class="stepNum">1</div>
            <div class="stepIconWrap">
              <i class="fi fi-rs-search stepIcon" />
            </div>
            <h3 class="stepTitle">Pesquise</h3>
            <p class="stepDesc">
              Escolha a sua rota e a data pretendida. Veja os lugares
              disponíveis em tempo real.
            </p>
          </div>
          <div class="stepConnector" />
          <div class="step">
            <div class="stepNum">2</div>
            <div class="stepIconWrap ticket">
              <img :src="ticketIcon" alt="" class="stepImg" />
            </div>
            <h3 class="stepTitle">Reserve</h3>
            <p class="stepDesc">
              Seleccione o seu assento, preencha os dados e confirme o
              pagamento.
            </p>
          </div>
          <div class="stepConnector" />
          <div class="step">
            <div class="stepNum">3</div>
            <div class="stepIconWrap">
              <i class="fi fi-rs-bus stepIcon" />
            </div>
            <h3 class="stepTitle">Viaje</h3>
            <p class="stepDesc">
              Receba o bilhete no WhatsApp e apareça na sede na hora da partida.
            </p>
          </div>
        </div>
      </div>
    </section>


<!--
     A NOSSA ROTA 
    <section class="routeSection">
      <div class="sectionWrap">
        <p class="sectionTag light">A nossa rota</p>
        <h2 class="sectionTitle light">Maputo → Johannesburg</h2>
        <p class="sectionDesc light">
          Uma rota directa com paragens estratégicas para o seu conforto.
        </p>
        <div class="routeTimeline">
          <div class="routeStop">
            <div class="stopDot origin" />
            <div class="stopInfo">
              <span class="stopName">Maputo</span>
              <span class="stopDetail"
                >Partida — Sede Portador Diário · 17:00</span
              >
            </div>
          </div>
          <div class="routeLine" />
          <div class="routeStop">
            <div class="stopDot" />
            <div class="stopInfo">
              <span class="stopName">Matola</span>
              <span class="stopDetail"
                >Último embarque antes da fronteira · máx. 20:30</span
              >
            </div>
          </div>
          <div class="routeLine" />
          <div class="routeStop">
            <div class="stopDot border" />
            <div class="stopInfo">
              <span class="stopName">Ressano Garcia</span>
              <span class="stopDetail"
                >Controlo migratório · Moçambique e África do Sul</span
              >
            </div>
          </div>
          <div class="routeLine" />
          <div class="routeStop">
            <div class="stopDot" />
            <div class="stopInfo">
              <span class="stopName">Malelane</span>
              <span class="stopDetail"
                >Paragem de descanso · 20 a 30 minutos</span
              >
            </div>
          </div>
          <div class="routeLine" />
          <div class="routeStop">
            <div class="stopDot" />
            <div class="stopInfo">
              <span class="stopName">Alzuim</span>
              <span class="stopDetail">Paragem de trânsito</span>
            </div>
          </div>
          <div class="routeLine" />
          <div class="routeStop">
            <div class="stopDot destination" />
            <div class="stopInfo">
              <span class="stopName">Johannesburg</span>
              <span class="stopDetail">Chegada — destino final</span>
            </div>
          </div>
        </div>
        <div class="scheduleCards">
          <div class="scheduleCard">
            <i class="fi fi-rs-bus scheduleIcon" />
            <div>
              <span class="scheduleRoute">Maputo → Johannesburg</span>
              <span class="scheduleDays">Segundas e Quartas · 17:00</span>
            </div>
          </div>
          <div class="scheduleCard">
            <i class="fi fi-rs-bus scheduleIcon" />
            <div>
              <span class="scheduleRoute">Johannesburg → Maputo</span>
              <span class="scheduleDays">Quartas e Sextas · 17:00</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    -->
    <!-- PORQUE NOS -->
    <!-- <section class="whySection">
      <div class="sectionWrap">
        <p class="sectionTag">Porquê a Portador Diário</p>
        <h2 class="sectionTitle">A sua viagem, com confiança</h2>
        <div class="featuresInner">
          <div class="featureCard">
            <div class="featureIconWrap">
              <i class="fi fi-rs-bus featureIcon" />
            </div>
            <div class="featureText">
              <span class="featureTitle">Frota Moderna</span>
              <span class="featureDesc"
                >Viaje com o máximo de conforto e segurança nos nossos novos
                veículos.</span
              >
            </div>
          </div>
          <div class="featureCard">
            <div class="featureIconWrap">
              <i class="fi fi-rs-shield-check featureIcon" />
            </div>
            <div class="featureText">
              <span class="featureTitle">Viagem Segura</span>
              <span class="featureDesc"
                >Motoristas profissionais com experiência na rota
                Maputo–Johannesburg.</span
              >
            </div>
          </div>
          <div class="featureCard">
            <div class="featureIconWrap">
              <i class="fi fi-rs-comment featureIcon" />
            </div>
            <div class="featureText">
              <span class="featureTitle">Bilhete por WhatsApp</span>
              <span class="featureDesc"
                >Recebe o seu bilhete directamente no WhatsApp após confirmar a
                reserva.</span
              >
            </div>
          </div>
          <div class="featureCard">
            <div class="featureIconWrap">
              <i class="fi fi-rs-headset featureIcon" />
            </div>
            <div class="featureText">
              <span class="featureTitle">Suporte 24h</span>
              <span class="featureDesc"
                >A nossa equipa está disponível para o apoiar antes e durante a
                viagem.</span
              >
            </div>
          </div>
        </div>
      </div>
    </section>
    -->

    <!-- A NOSSA FROTA -->
    <section id="frota" class="fleetSection">
      <img :src="symbolLima" alt="" aria-hidden="true" class="fleetWatermark" />
      <div class="fleetContent">
        <figure class="fleetMedia">
          <span class="fleetLivery" aria-hidden="true" />
          <img
            :src="vanFleet"
            alt="Carrinha Mercedes-Benz Sprinter da Portador Diário, pintada a roxo e lima, com atrelado de bagagem"
            class="fleetImage"
            loading="lazy"
          />
          <figcaption class="fleetCaption">
            <i class="fi fi-rs-camera" /> Foto real da nossa carrinha
          </figcaption>
        </figure>

        <div class="fleetText">
          <p class="sectionTag">A nossa frota</p>
          <h2 class="sectionTitle">A carrinha em que vai viajar</h2>
          <p class="fleetDesc">
            Fazemos a rota numa Mercedes-Benz Sprinter com as cores da
            Portador Diário. A bagagem segue num atrelado atrás, por isso o
            espaço dentro da carrinha fica para os passageiros.
          </p>

          <dl class="fleetSpecs">
            <div class="spec">
              <dt>19</dt>
              <dd>lugares individuais</dd>
            </div>
            <div class="spec">
              <dt>A/C</dt>
              <dd>ar condicionado</dd>
            </div>
            <div class="spec">
              <dt>1</dt>
              <dd>atrelado só para bagagem</dd>
            </div>
            <div class="spec">
              <dt>2×</dt>
              <dd>partidas por semana em cada sentido</dd>
            </div>
          </dl>

          <button class="fleetBtn" @click="scrollToSearch">
            Reservar lugar
            <i class="fi fi-rs-arrow-small-up fleetBtnIcon" />
          </button>
        </div>
      </div>
    </section>

    <!-- CONTACTO -->
    <section id="contacto" class="contactSection">
      <div class="sectionWrap">
        <p class="sectionTag light">Precisa de ajuda?</p>
        <h2 class="sectionTitle light">Fale connosco</h2>
        <p class="sectionDesc light">
          A nossa equipa está disponível para responder a todas as suas
          questões.
        </p>
        <div class="contactCards">
          <a
            class="contactCard"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener"
          >
            <div class="contactIconWrap">
              <img :src="whatsappIcon" alt="" class="contactImg" />
            </div>
            <div class="contactText">
              <span class="contactLabel">WhatsApp</span>
              <span class="contactValue">+258 86 205 1706</span>
              <span class="contactCta">Iniciar conversa</span>
            </div>
            <i class="fi fi-rs-angle-right contactArrow" />
          </a>
          <a class="contactCard" href="mailto:info@portadordiario.co.mz">
            <div class="contactIconWrap">
              <img :src="gmailIcon" alt="" class="contactImg" />
            </div>
            <div class="contactText">
              <span class="contactLabel">Email</span>
              <span class="contactValue">info@portadordiario.co.mz</span>
              <span class="contactCta">Enviar email</span>
            </div>
            <i class="fi fi-rs-angle-right contactArrow" />
          </a>
          <a class="contactCard" href="tel:+258821208151">
            <div class="contactIconWrap">
              <i class="fi fi-rs-phone-call contactIcon" />
            </div>
            <div class="contactText">
              <span class="contactLabel">Telefone</span>
              <span class="contactValue">+258 82 120 8151</span>
              <span class="contactCta">Ligar agora</span>
            </div>
            <i class="fi fi-rs-angle-right contactArrow" />
          </a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footerTop">
        <div class="footerBrand">
          <img :src="LogoPD" alt="Portador Diário" class="footerLogo" />
          <span class="footerTagline">o seu correio onde estiver</span>
        </div>

        <nav class="footerNav" aria-label="Rodapé">
          <button class="footerLink" @click="scrollToSearch">Reservar viagem</button>
          <button class="footerLink" @click="scrollToSection('como-funciona')">Como funciona</button>
          <button class="footerLink" @click="scrollToSection('frota')">A nossa frota</button>
          <button class="footerLink" @click="scrollToSection('contacto')">Contacto</button>
        </nav>

        <button class="footerContactBtn" @click="openWhatsApp">
          Contacte-nos
        </button>
      </div>

      <div class="footerBottom">
        <span class="footerCopy">
          © {{ new Date().getFullYear() }} Portador Diário
        </span>
        <span class="footerRoute">
          <img :src="flagMz" alt="Moçambique" class="footerFlag" />
          Maputo
          <span class="footerRouteArrow">⇄</span>
          Johannesburg
          <img :src="flagZa" alt="África do Sul" class="footerFlag" />
        </span>
      </div>
    </footer>

    <!-- WHATSAPP FLUTUANTE -->
    <a
      class="waFab"
      :href="whatsappUrl"
      target="_blank"
      rel="noopener"
      aria-label="Fale connosco no WhatsApp"
    >
      <span class="waFabLabel">Dúvidas? Fale connosco</span>
      <span class="waFabBtn">
        <img :src="whatsappIcon" alt="" />
      </span>
    </a>
  </div>
</template>

<style scoped>
.customSelect.disabled {
    opacity: 0.6;
    cursor: default;
}

.selectValue.muted {
    color: #999;
}

.searchError {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: #FDECEA;
    color: #C0392B;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
}

.searchRetry {
    margin-left: auto;
    border: none;
    background: #C0392B;
    color: #fff;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

.page {
  min-height: 100vh;
  background: #f6f6f6;
  display: flex;
  flex-direction: column;
}

/* ── HERO ── */
.hero {
  position: relative;
  background-size: cover;
  background-position: center 30%;
  padding: 100px 24px 140px;
}

.heroOverlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(13, 13, 43, 0.72) 0%,
    rgba(13, 13, 43, 0.55) 60%,
    rgba(13, 13, 43, 0.75) 100%
  );
}

.heroInner {
  position: relative;
  z-index: 1;
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
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 50px;
  backdrop-filter: blur(4px);
}

.heroTitle {
  color: #fff;
  font-size: clamp(32px, 6vw, 56px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
}

.heroSub {
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
}

.heroArrow {
  color: #c4a0b8;
  font-weight: 700;
}

/* ── SEARCH CARD ── */
.cardWrap {
  max-width: 520px;
  width: 100%;
  margin: -70px auto 0;
  padding: 0 20px;
  position: relative;
  z-index: 10;
}

.searchCard {
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18);
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
  border: 1.5px solid #e0e0e0;
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
  color: #221f20;
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
  border: 1.5px solid #e0e0e0;
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
  background: #f6f0f4;
}

.dropdownItem.active {
  background: rgba(146, 40, 119, 0.08);
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
  transition:
    opacity 0.15s,
    transform 0.1s;
  font-family: Helvetica, sans-serif;
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

/* ── TRUST ── */
.trust {
  padding: 40px 24px 32px;
}

.trustInner {
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.trustItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 8px;
  background: #fff;
  border: 1px solid #f0e8ed;
  border-radius: 14px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.trustItem:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(146, 40, 119, 0.1);
}

.trustIconWrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(146, 40, 119, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.trustIconWrap.brand {
  background: rgba(37, 211, 102, 0.1);
}

.trustImg {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.trustIcon {
  font-size: 20px;
  color: #922877;
  position: relative;
  top: 2px;
}

.trustLabel {
  font-size: 12px;
  color: #888;
  text-align: center;
  line-height: 1.4;
}

.trustLabel strong {
  display: block;
  color: #0d0d2b;
  font-weight: 700;
}

/* ── SECTION COMMONS ── */
.sectionWrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

.sectionTag {
  font-size: 12px;
  font-weight: 700;
  color: #922877;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 8px;
}

.sectionTag.light {
  color: rgba(255, 255, 255, 0.7);
}

.sectionTitle {
  font-size: clamp(24px, 4vw, 36px);
  font-weight: 800;
  color: #0d0d2b;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.sectionTitle.light {
  color: #fff;
}

.sectionDesc {
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  max-width: 560px;
  margin-bottom: 40px;
}

.sectionDesc.light {
  color: rgba(255, 255, 255, 0.75);
}

/* ── COMO FUNCIONA ── */
.howSection {
  background: #fff;
  padding: 80px 0;
}

.steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
  flex-direction: column;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 24px;
  flex: 1;
}

.stepNum {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(146, 40, 119, 0.1);
  color: #922877;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepIconWrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(146, 40, 119, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* O bilhete usa um gradiente azul→roxo; o fundo acompanha-o */
.stepIconWrap.ticket {
  background: linear-gradient(
    135deg,
    rgba(125, 196, 255, 0.18),
    rgba(196, 120, 240, 0.2)
  );
}

.stepImg {
  width: 34px;
  height: 34px;
  object-fit: contain;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.step:hover .stepImg {
  transform: rotate(-12deg) scale(1.12);
}

.stepIcon {
  font-size: 26px;
  color: #922877;
  position: relative;
  top: 1px;
}

.stepTitle {
  font-size: 17px;
  font-weight: 700;
  color: #0d0d2b;
}

.stepDesc {
  font-size: 14px;
  color: #888;
  line-height: 1.55;
  max-width: 220px;
}

.stepConnector {
  width: 2px;
  height: 32px;
  background: #eeeeee;
  margin: 0 auto;
}

/* ── A NOSSA ROTA ── */
.routeSection {
  background: #0d0d2b;
  padding: 80px 0;
}

.routeTimeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 40px;
}

.routeStop {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.stopDot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  margin-top: 3px;
}

.stopDot.origin {
  background: #922877;
  border-color: #922877;
}
.stopDot.destination {
  background: #8b9b1a;
  border-color: #8b9b1a;
}
.stopDot.border {
  background: #ffb300;
  border-color: #ffb300;
}

.stopInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 20px;
}

.stopName {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.stopDetail {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.routeLine {
  width: 2px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin-left: 6px;
}

.scheduleCards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scheduleCard {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.scheduleIcon {
  font-size: 18px;
  color: #922877;
  flex-shrink: 0;
  position: relative;
  top: 1px;
}

.scheduleRoute {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  display: block;
}

.scheduleDays {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  display: block;
  margin-top: 2px;
}

/* ── PORQUE NOS ── */
.whySection {
  background: #f6f6f6;
  padding: 80px 0;
}

.featuresInner {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.featureCard {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  border: 1px solid #f0e8ed;
}

.featureIconWrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(146, 40, 119, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.featureIcon {
  font-size: 20px;
  color: #922877;
  position: relative;
  top: 1px;
}

.featureText {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.featureTitle {
  font-size: 15px;
  font-weight: 700;
  color: #0d0d2b;
}

.featureDesc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

/* O header publico e sticky: as ancoras param abaixo dele */
#como-funciona,
#frota,
#contacto {
  scroll-margin-top: 72px;
}

/* ── FROTA ── */
.fleetSection {
  position: relative;
  overflow: hidden;
  background: #fff;
  padding: 80px 24px;
}

/* Simbolo da marca em grande, quase invisivel, a dar textura ao fundo */
.fleetWatermark {
  position: absolute;
  right: -120px;
  bottom: -140px;
  width: 420px;
  opacity: 0.08;
  pointer-events: none;
}

.fleetContent {
  position: relative;
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.fleetMedia {
  position: relative;
  margin: 0;
}

/* Faixas roxo/lima atras da foto, tiradas da pintura da propria carrinha */
.fleetLivery {
  position: absolute;
  inset: 18px -14px -14px 18px;
  border-radius: 20px;
  background: linear-gradient(
    115deg,
    #922877 0%,
    #922877 58%,
    #c5d22d 58%,
    #c5d22d 72%,
    #922877 72%
  );
}

.fleetImage {
  position: relative;
  width: 100%;
  height: 260px;
  object-fit: cover;
  object-position: 40% 60%;
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(13, 13, 43, 0.18);
}

.fleetCaption {
  position: absolute;
  left: 14px;
  bottom: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(13, 13, 43, 0.72);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 8px;
}

.fleetCaption .fi {
  position: relative;
  top: 1px;
  color: #c5d22d;
}

.fleetText {
  display: flex;
  flex-direction: column;
}

.fleetDesc {
  font-size: 15px;
  color: #666;
  line-height: 1.65;
  max-width: 460px;
  margin-bottom: 28px;
}

/* Ficha tecnica: numero grande + legenda, separados por linhas finas */
.fleetSpecs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  border-top: 1px solid #eee;
  margin-bottom: 32px;
}

.spec {
  padding: 18px 16px 18px 0;
  border-bottom: 1px solid #eee;
}

.spec:nth-child(odd) {
  border-right: 1px solid #eee;
}

.spec:nth-child(even) {
  padding-left: 20px;
}

.spec dt {
  font-size: 30px;
  font-weight: 700;
  color: #922877;
  line-height: 1;
  letter-spacing: -0.02em;
}

.spec dd {
  margin-top: 6px;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.fleetBtn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  background: #922877;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 22px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.fleetBtn:hover {
  opacity: 0.88;
}

.fleetBtnIcon {
  position: relative;
  top: 2px;
  transition: transform 0.2s;
}

.fleetBtn:hover .fleetBtnIcon {
  transform: translateY(-3px);
}

/* Realce do cartao de pesquisa quando um CTA de baixo leva o cliente la */
.searchCard {
  transition: box-shadow 0.3s;
}

.searchCard.highlight {
  animation: cardHighlight 1.6s ease-out;
}

@keyframes cardHighlight {
  0% {
    box-shadow:
      0 12px 48px rgba(0, 0, 0, 0.18),
      0 0 0 0 rgba(146, 40, 119, 0.5);
  }
  40% {
    box-shadow:
      0 12px 48px rgba(0, 0, 0, 0.18),
      0 0 0 8px rgba(146, 40, 119, 0.25);
  }
  100% {
    box-shadow:
      0 12px 48px rgba(0, 0, 0, 0.18),
      0 0 0 14px rgba(146, 40, 119, 0);
  }
}

/* ── CONTACTO ── */
.contactSection {
  background: #922877;
  padding: 80px 0;
}

.contactCards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contactCard {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  color: inherit;
  text-decoration: none;
  transition:
    background 0.2s,
    transform 0.2s,
    box-shadow 0.2s;
}

.contactCard:hover,
.contactCard:focus-visible {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(13, 13, 43, 0.25);
}

.contactCard:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

/* Ícone solto, sem fundo: só um brilho suave por trás que acende no hover */
.contactIconWrap {
  position: relative;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contactIconWrap::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.35) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.contactCard:hover .contactIconWrap::before {
  opacity: 1;
  transform: scale(1);
}

.contactImg,
.contactIcon {
  position: relative;
  filter: drop-shadow(0 6px 10px rgba(13, 13, 43, 0.35));
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.contactImg {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.contactIcon {
  font-size: 34px;
  color: #fff;
  top: 3px;
}

.contactCard:hover .contactImg,
.contactCard:hover .contactIcon {
  transform: translateY(-4px) rotate(-10deg) scale(1.12);
}

.contactCta {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s;
}

.contactCard:hover .contactCta {
  color: #fff;
}

.contactText {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contactLabel {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.contactValue {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.contactArrow {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}

/* ── FOOTER ── alinhado com o PublicHeader: fundo branco, linha #EEE, logo a cores */
.footer {
  background: #fff;
  border-top: 1px solid #eeeeee;
  padding: 0 24px;
}

.footerTop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 32px 0 24px;
  text-align: center;
}

.footerBrand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.footerLogo {
  height: 36px;
  width: auto;
}

.footerTagline {
  font-size: 12px;
  color: #999;
}

.footerNav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 20px;
}

.footerLink {
  background: none;
  border: none;
  padding: 4px 0;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: color 0.15s;
}

.footerLink:hover {
  color: #922877;
}

.footerContactBtn {
  background: #922877;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.footerContactBtn:hover {
  opacity: 0.88;
}

.footerBottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #eeeeee;
  /* espaco extra para o botao flutuante do WhatsApp nao tapar o texto */
  padding: 16px 0 88px;
}

.footerCopy {
  font-size: 12px;
  color: #999;
}

.footerRoute {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.footerFlag {
  width: 18px;
  height: 12px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.footerRouteArrow {
  color: #922877;
}

/* ── WHATSAPP FLUTUANTE ── */
.waFab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.waFabBtn {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.waFabBtn::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #25d366;
  animation: fabRing 2.4s ease-out infinite;
}

.waFabBtn img {
  position: relative;
  width: 58px;
  height: 58px;
  filter: drop-shadow(0 8px 14px rgba(13, 13, 43, 0.3));
}

.waFab:hover .waFabBtn {
  transform: rotate(-10deg) scale(1.1);
}

.waFabLabel {
  display: none;
  background: #0d0d2b;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 50px;
  box-shadow: 0 6px 16px rgba(13, 13, 43, 0.2);
  opacity: 0;
  transform: translateX(8px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.waFab:hover .waFabLabel,
.waFab:focus-visible .waFabLabel {
  opacity: 1;
  transform: translateX(0);
}

@keyframes fabRing {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  70%,
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .searchCard.highlight,
  .waFabBtn::before {
    animation: none;
  }
}

/* ── TRANSITIONS ── */
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── TABLET 768px ── */
@media (min-width: 768px) {
  .hero {
    padding: 120px 24px 180px;
  }
  .cardWrap {
    max-width: 560px;
    margin-top: -90px;
  }
  .trustInner {
    max-width: 760px;
  }

  .steps {
    flex-direction: row;
    align-items: flex-start;
  }

  .stepConnector {
    width: 60px;
    height: 2px;
    margin: 40px 0 0 0;
    flex-shrink: 0;
  }

  /* rota horizontal */
  .routeTimeline {
    flex-direction: row;
    align-items: flex-start;
    margin-bottom: 40px;
  }

  .routeStop {
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
    min-width: 0;
    gap: 8px;
  }

  .stopDot {
    margin-top: 0;
    flex-shrink: 0;
  }

  .stopInfo {
    align-items: center;
    padding-bottom: 0;
  }

  .stopName {
    font-size: 13px;
  }
  .stopDetail {
    font-size: 11px;
  }

  .routeLine {
    width: 32px;
    height: 2px;
    margin-top: 6px;
    margin-left: 0;
    flex-shrink: 0;
  }

  .scheduleCards {
    flex-direction: row;
  }
  .scheduleCard {
    flex: 1;
  }

  .featuresInner {
    grid-template-columns: repeat(2, 1fr);
  }

  .fleetContent {
    flex-direction: row;
    align-items: center;
    gap: 64px;
  }
  .fleetText {
    flex: 1;
  }
  .fleetMedia {
    flex: 1.15;
  }
  .fleetImage {
    height: 400px;
  }
  .fleetWatermark {
    width: 560px;
    right: -160px;
    bottom: -180px;
  }

  .contactCards {
    flex-direction: row;
  }
  .contactCard {
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
  }
  .contactArrow {
    display: none;
  }

  .footerTop {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }
  .footerBrand {
    align-items: flex-start;
  }
  .footerBottom {
    flex-direction: row;
    justify-content: space-between;
  }
}

/* ── DESKTOP 1024px ── */
@media (min-width: 1024px) {
  .hero {
    padding: 140px 40px 200px;
  }
  .cardWrap {
    max-width: 580px;
    margin-top: -110px;
    padding: 0;
  }
  .trustInner {
    max-width: 900px;
  }

  .howSection {
    padding: 100px 0;
  }
  .routeSection {
    padding: 100px 0;
  }
  .whySection {
    padding: 100px 0;
  }
  .fleetSection {
    padding: 100px 40px;
  }
  .contactSection {
    padding: 100px 0;
  }

  .featuresInner {
    grid-template-columns: repeat(4, 1fr);
  }

  .footer {
    padding: 0 40px;
  }
  .footerLogo {
    height: 40px;
  }
  /* No desktop o botao flutuante fica ao lado do texto, nao por cima */
  .footerBottom {
    padding-bottom: 16px;
    padding-right: 100px;
  }

  .waFab {
    right: 28px;
    bottom: 28px;
  }
  .waFabLabel {
    display: block;
  }

  .stopName {
    font-size: 14px;
  }
  .stopDetail {
    font-size: 11px;
  }
}

/* ── LARGE 1440px ── */
@media (min-width: 1440px) {
  .hero {
    padding: 160px 40px 220px;
  }
  .cardWrap {
    max-width: 600px;
    margin-top: -120px;
  }
  .trustInner {
    max-width: 960px;
  }
  .featuresInner {
    max-width: none;
  }
}
</style>
