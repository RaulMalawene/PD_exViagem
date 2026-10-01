<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePublicBookingStore } from "../../stores/publicBookingStore";
import { parseApiError } from "../../utils/parseApiError";
import DatePicker from "../../components/DatePicker.vue";
import heroBg from "../../assets/hero-boarding.png";
import fotoFrente from "../../assets/imagem_viatura/sprinter-frente.jpeg";
import fotoComAtrelado from "../../assets/imagem_viatura/sprinter-com-atrelado.jpeg";
import fotoInteriorCorredor from "../../assets/imagem_viatura/interior-corredor.jpeg";
import fotoLateral from "../../assets/imagem_viatura/sprinter-lateral.jpeg";
import fotoDuasPerfil from "../../assets/imagem_viatura/sprinter-duas-perfil.jpeg";
import fotoInteriorBancos from "../../assets/imagem_viatura/interior-bancos.jpeg";
import fotoAtrelados from "../../assets/imagem_viatura/atrelados-bagagem.jpeg";
import fotoDuasFrente from "../../assets/imagem_viatura/sprinter-duas-frente.jpeg";
import fotoBancoDetalhe from "../../assets/imagem_viatura/interior-banco-detalhe.jpeg";
import LogoPD from "../../assets/LogoPD.svg";
import whatsappIcon from "../../assets/whatsapp.png";
import gmailIcon from "../../assets/gmail.png";
import ticketIcon from "../../assets/ticket.png";
import shieldIcon from "../../assets/shield.png";
import supportIcon from "../../assets/customer-suport-azul.png";
import mpesaIcon from "../../assets/mpesa.png";
import emolaIcon from "../../assets/emola.png";
import cardIcon from "../../assets/card.png";
import symbolLima from "../../assets/symbol-lima.svg";
import symbolWhite from "../../assets/symbol-white.svg";
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

// ── Galeria da frota ──
// As fotos sao quadradas e as carrinhas ficam na metade de cima, dai o "pos"
// por foto para o recorte nao cortar o veiculo.
const fleetPhotos = [
  { src: fotoFrente, pos: "50% 45%", alt: "Mercedes-Benz Sprinter da Portador Diário vista de frente, com a pintura roxa e lima" },
  { src: fotoComAtrelado, pos: "40% 35%", alt: "Carrinha da Portador Diário com o atrelado de bagagem engatado" },
  { src: fotoInteriorCorredor, pos: "50% 40%", alt: "Interior da carrinha: filas de bancos individuais e corredor central" },
  { src: fotoLateral, pos: "60% 40%", alt: "Lateral da carrinha com o logotipo Portador Diário" },
  { src: fotoDuasPerfil, pos: "50% 35%", alt: "Duas carrinhas Sprinter da frota estacionadas lado a lado" },
  { src: fotoInteriorBancos, pos: "50% 45%", alt: "Bancos estofados com apoio de braço" },
  { src: fotoAtrelados, pos: "50% 45%", alt: "Atrelados de bagagem da Portador Diário vistos de trás" },
  { src: fotoDuasFrente, pos: "50% 30%", alt: "Frente de duas carrinhas Mercedes-Benz Sprinter" },
  { src: fotoBancoDetalhe, pos: "50% 50%", alt: "Detalhe de um banco de passageiro" },
];

const FLEET_INTERVAL = 5000;
const fleetIndex = ref(0);
const fleetHover = ref(false);
const pageHidden = ref(false);
const fleetInView = ref(false);
// So se carrega uma foto quando chega a vez dela (ou a seguinte), para nao
// descarregar as 9 de uma vez ao abrir a pagina.
const fleetLoaded = ref(new Set([0, 1, 2]));
const fleetMediaRef = ref(null);
let fleetObserver = null;
let touchStartX = 0;

const fleetRunning = computed(
  () => fleetInView.value && !fleetHover.value && !pageHidden.value,
);

function goToPhoto(i) {
  const total = fleetPhotos.length;
  fleetIndex.value = (i + total) % total;
  const loaded = new Set(fleetLoaded.value);
  for (let k = 0; k < 3; k++) loaded.add((fleetIndex.value + k) % total);
  fleetLoaded.value = loaded;
}

// Lugar de cada foto no baralho, relativo a que esta a frente
function cardPosition(i) {
  const total = fleetPhotos.length;
  const offset = (i - fleetIndex.value + total) % total;
  if (offset === 0) return "front";
  if (offset === 1) return "back1";
  if (offset === 2) return "back2";
  if (offset === total - 1) return "out";
  return "hidden";
}

// Avanca sozinho; cada troca (automatica ou manual) reinicia a contagem
let fleetTimer = null;
watch([fleetIndex, fleetRunning], () => {
  clearTimeout(fleetTimer);
  if (fleetRunning.value) {
    fleetTimer = setTimeout(() => goToPhoto(fleetIndex.value + 1), FLEET_INTERVAL);
  }
});

function onFleetTouchStart(e) {
  touchStartX = e.touches[0].clientX;
}

function onFleetTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) goToPhoto(fleetIndex.value + (dx < 0 ? 1 : -1));
}

function onVisibilityChange() {
  pageHidden.value = document.hidden;
}

// Secções que animam uma vez quando aparecem no ecra
const trustRef = ref(null);
const trustVisible = ref(false);
const howRef = ref(null);
const howVisible = ref(false);
const contactRef = ref(null);
const contactVisible = ref(false);
const revealObservers = [];

function revealOnce(el, flag) {
  if (!el) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      flag.value = true;
      observer.disconnect();
    },
    { threshold: 0.2 },
  );
  observer.observe(el);
  revealObservers.push(observer);
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
  clearTimeout(fleetTimer);
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

const contactChannels = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    value: "+258 86 205 1706",
    action: "Iniciar conversa",
    href: whatsappUrl,
    img: whatsappIcon,
    external: true,
  },
  {
    key: "email",
    label: "Email",
    value: "info@portadordiario.co.mz",
    action: "Enviar email",
    href: "mailto:info@portadordiario.co.mz",
    img: gmailIcon,
  },
  {
    key: "phone",
    label: "Telefone",
    value: "+258 82 120 8151",
    action: "Ligar",
    href: "tel:+258821208151",
    icon: "fi-rs-phone-call",
  },
];

onMounted(async () => {
  document.addEventListener("click", closeAll);
  // Chegar aqui e sempre o inicio de uma reserva nova (nunca um "voltar atras" dentro
  // de um fluxo em curso - isso vai para /booking/results) - limpa o estado da reserva
  // anterior para o token de sessao nao ser reaproveitado entre reservas diferentes.
  // startNewFlow tambem limpa a marca de "ja pago", para quem volta a
  // landing page poder fazer uma reserva nova.
  document.addEventListener("visibilitychange", onVisibilityChange);
  // A galeria so roda quando a secção esta no ecra
  fleetObserver = new IntersectionObserver(
    ([entry]) => (fleetInView.value = entry.isIntersecting),
    { threshold: 0.3 },
  );
  if (fleetMediaRef.value) fleetObserver.observe(fleetMediaRef.value);

  revealOnce(trustRef.value, trustVisible);
  revealOnce(howRef.value, howVisible);
  revealOnce(contactRef.value, contactVisible);

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
  fleetObserver?.disconnect();
  revealObservers.forEach((o) => o.disconnect());
  document.removeEventListener("visibilitychange", onVisibilityChange);
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

    <!-- GARANTIAS -->
    <div ref="trustRef" class="trust" :class="{ visible: trustVisible }">
      <div class="trustInner">
        <article class="trustCard whatsapp">
          <span class="trustIconWrap">
            <img :src="whatsappIcon" alt="" class="trustImg" />
          </span>
          <div class="trustBody">
            <h3 class="trustTitle">Bilhete no WhatsApp</h3>
            <p class="trustText">
              Recebe o bilhete no telemóvel logo depois de confirmar o
              pagamento.
            </p>
          </div>
        </article>

        <article class="trustCard secure">
          <span class="trustIconWrap">
            <img :src="shieldIcon" alt="" class="trustImg" />
          </span>
          <div class="trustBody">
            <h3 class="trustTitle">Pagamento seguro</h3>
            <p class="trustText">
              Pague por M-Pesa, e-Mola ou cartão Visa e Mastercard.
            </p>
            <div class="trustMethods">
              <img :src="mpesaIcon" alt="M-Pesa" class="trustMethod" />
              <img :src="emolaIcon" alt="e-Mola" class="trustMethod" />
              <img :src="cardIcon" alt="Cartão" class="trustMethod" />
            </div>
          </div>
        </article>

        <article class="trustCard support">
          <span class="trustIconWrap">
            <img :src="supportIcon" alt="" class="trustImg" />
          </span>
          <div class="trustBody">
            <h3 class="trustTitle">Suporte 24h</h3>
            <p class="trustText">
              Por WhatsApp ou telefone, antes e durante a viagem.
            </p>
            <button class="trustLink" @click="scrollToSection('contacto')">
              Falar connosco
              <i class="fi fi-rs-arrow-small-right" />
            </button>
          </div>
        </article>
      </div>
    </div>

    <!-- COMO FUNCIONA -->
    <section
      id="como-funciona"
      ref="howRef"
      class="howSection"
      :class="{ visible: howVisible }"
    >
      <div class="sectionWrap">
        <p class="sectionTag">Simples e rápido</p>
        <h2 class="sectionTitle">Como funciona</h2>
        <p class="sectionDesc">
          Reserve o seu lugar em menos de 5 minutos, sem filas e sem sair de
          casa.
        </p>

        <ol class="steps">
          <!-- estrada que liga os passos; o autocarro percorre-a uma vez -->
          <li class="howRoad" aria-hidden="true">
            <span class="howBus"><i class="fi fi-rs-bus" /></span>
          </li>

          <li class="step">
            <span class="stepNode">
              <i class="fi fi-rs-search stepIcon" />
            </span>
            <div class="stepBody">
              <span class="stepNum">Passo 1</span>
              <h3 class="stepTitle">Pesquise</h3>
              <p class="stepDesc">
                Escolha a rota e a data. Vê logo os lugares que ainda estão
                livres.
              </p>
              <button class="stepLink" @click="scrollToSearch">
                Pesquisar agora
                <i class="fi fi-rs-arrow-small-up" />
              </button>
            </div>
          </li>

          <li class="step">
            <span class="stepNode ticket">
              <img :src="ticketIcon" alt="" class="stepImg" />
            </span>
            <div class="stepBody">
              <span class="stepNum">Passo 2</span>
              <h3 class="stepTitle">Reserve</h3>
              <p class="stepDesc">
                Escolha o assento, preencha os dados dos passageiros e pague.
              </p>
              <div class="stepMethods">
                <img :src="mpesaIcon" alt="M-Pesa" />
                <img :src="emolaIcon" alt="e-Mola" />
                <img :src="cardIcon" alt="Cartão" />
              </div>
            </div>
          </li>

          <li class="step">
            <span class="stepNode">
              <i class="fi fi-rs-bus stepIcon" />
            </span>
            <div class="stepBody">
              <span class="stepNum">Passo 3</span>
              <h3 class="stepTitle">Viaje</h3>
              <p class="stepDesc">
                Recebe o bilhete no WhatsApp. No dia, apresente-se na sede antes
                da hora de partida.
              </p>
              <button class="stepLink" @click="scrollToSection('frota')">
                Conhecer a frota
                <i class="fi fi-rs-arrow-small-right" />
              </button>
            </div>
          </li>
        </ol>
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
        <div ref="fleetMediaRef" class="fleetMedia">
          <div
            class="fleetSlider"
            role="region"
            aria-roledescription="carrossel"
            aria-label="Fotografias da frota"
            tabindex="0"
            @mouseenter="fleetHover = true"
            @mouseleave="fleetHover = false"
            @focusin="fleetHover = true"
            @focusout="fleetHover = false"
            @keydown.left.prevent="goToPhoto(fleetIndex - 1)"
            @keydown.right.prevent="goToPhoto(fleetIndex + 1)"
            @touchstart.passive="onFleetTouchStart"
            @touchend="onFleetTouchEnd"
          >
            <!-- Baralho: a foto da frente sai, a de tras avanca para o lugar dela -->
            <div
              v-for="(photo, i) in fleetPhotos"
              :key="photo.src"
              class="fleetCard"
              :class="cardPosition(i)"
              :aria-hidden="i !== fleetIndex"
              @click="cardPosition(i) === 'back1' && goToPhoto(i)"
            >
              <img
                v-if="fleetLoaded.has(i)"
                :src="photo.src"
                :alt="photo.alt"
                :style="{ objectPosition: photo.pos }"
                class="fleetSlide"
                decoding="async"
              />
            </div>

            <div class="fleetControls">
              <button
                class="fleetNav prev"
                aria-label="Foto anterior"
                @click="goToPhoto(fleetIndex - 1)"
              >
                <i class="fi fi-rs-angle-small-left" />
              </button>
              <button
                class="fleetNav next"
                aria-label="Foto seguinte"
                @click="goToPhoto(fleetIndex + 1)"
              >
                <i class="fi fi-rs-angle-small-right" />
              </button>
            </div>
          </div>
        </div>

        <div class="fleetText">
          <p class="sectionTag">A nossa frota</p>
          <h2 class="sectionTitle">As carrinhas em que vai viajar</h2>
          <p class="fleetDesc">
            Fazemos a rota em carrinhas Mercedes-Benz Sprinter com as cores da
            Portador Diário. A bagagem segue num atrelado atrás, por isso o
            espaço dentro da carrinha fica para os passageiros.
          </p>

          <dl class="fleetSpecs">
            <div class="spec">
              <dt>19</dt>
              <dd>Lugares individuais</dd>
            </div>
            <div class="spec">
              <dt>A/C</dt>
              <dd>Ar condicionado</dd>
            </div>
            <div class="spec">
              <dt>1</dt>
              <dd>Atrelado só para bagagem</dd>
            </div>
            <div class="spec">
              <dt>2×</dt>
              <dd>Partidas por semana em cada sentido</dd>
            </div>
          </dl>

          <button class="fleetBtn" @click="scrollToSearch">
            Reservar lugar
            <i class="fi fi-rs-arrow-small-up fleetBtnIcon" />
          </button>
        </div>
      </div>
    </section>

    <!-- CONTACTO + RODAPE -->
    <footer
      id="contacto"
      ref="contactRef"
      class="siteFooter"
      :class="{ visible: contactVisible }"
    >
      <!-- Fundo com a pintura das carrinhas: roxo com faixas lima e magenta -->
      <svg
        class="sfLivery"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          class="sfBand magenta"
          d="M0 520 C 420 430 860 250 1440 60 L1440 250 C 900 400 460 560 0 650 Z"
        />
        <path
          class="sfBand lime"
          d="M0 600 C 460 500 900 330 1440 180 L1440 300 C 940 440 500 600 0 700 Z"
        />
        <path
          class="sfStripe"
          d="M0 668 C 480 560 920 400 1440 262"
          fill="none"
        />
      </svg>
      <img :src="symbolWhite" alt="" aria-hidden="true" class="sfSymbol" />

      <div class="sfInner">
        <!-- CONTACTO -->
        <div class="sfContact">
          <div class="sfHead">
            <p class="sectionTag light">Precisa de ajuda?</p>
            <h2 class="sfTitle">Fale connosco</h2>
            <p class="sfDesc">
              Respondemos por WhatsApp, email ou telefone. Escolha o canal que
              lhe der mais jeito.
            </p>
          </div>

          <ul class="sfChannels">
            <li v-for="channel in contactChannels" :key="channel.key">
              <a
                class="sfChannel"
                :class="channel.key"
                :href="channel.href"
                :target="channel.external ? '_blank' : undefined"
                :rel="channel.external ? 'noopener' : undefined"
              >
                <span class="sfIcon">
                  <img v-if="channel.img" :src="channel.img" alt="" />
                  <i v-else :class="['fi', channel.icon]" />
                </span>
                <span class="sfLabel">{{ channel.label }}</span>
                <span class="sfValue">{{ channel.value }}</span>
                <span class="sfAction">
                  <span class="sfActionText">{{ channel.action }}</span>
                  <i class="fi fi-rs-arrow-small-right" />
                </span>
              </a>
            </li>
          </ul>
        </div>

        <!-- a estrada do "Como funciona" volta aqui, a fechar a pagina -->
        <div class="sfRoad" aria-hidden="true">
          <span class="sfBus"><i class="fi fi-rs-bus" /></span>
        </div>

        <!-- RODAPE -->
        <div class="sfBottom">
          <div class="sfBrand">
            <img :src="LogoPD" alt="Portador Diário" class="sfLogo" />
            <span class="sfTagline">o seu correio onde estiver</span>
          </div>

          <nav class="sfNav" aria-label="Rodapé">
            <button class="sfLink" @click="scrollToSearch">Reservar viagem</button>
            <button class="sfLink" @click="scrollToSection('como-funciona')">
              Como funciona
            </button>
            <button class="sfLink" @click="scrollToSection('frota')">
              A nossa frota
            </button>
          </nav>

          <span class="sfRoute">
            <img :src="flagMz" alt="Moçambique" class="sfFlag" />
            Maputo
            <span class="sfRouteArrow">⇄</span>
            Johannesburg
            <img :src="flagZa" alt="África do Sul" class="sfFlag" />
          </span>
        </div>

        <p class="sfCopy">© {{ new Date().getFullYear() }} Portador Diário</p>
      </div>
    </footer>

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

/* ── GARANTIAS ──
   Mesmo vocabulario dos outros cartoes da pagina (fundo branco, borda
   #f0e8ed, raio 16px). Cada cartao tem a cor do seu icone. */
.trust {
  padding: 40px 20px 48px;
}

.trustInner {
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.trustCard {
  --accent: #922877;
  --accent-soft: rgba(146, 40, 119, 0.1);
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border: 1px solid #f0e8ed;
  border-radius: 16px;
  overflow: hidden;
  /* entrada: escondidos ate a secção aparecer, depois sobem em cascata */
  opacity: 0;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.trustCard.whatsapp {
  --accent: #25d366;
  --accent-soft: rgba(37, 211, 102, 0.12);
}

.trustCard.secure {
  --accent: #1fcf85;
  --accent-soft: rgba(31, 207, 133, 0.12);
}

.trustCard.support {
  --accent: #3a9ad9;
  --accent-soft: rgba(58, 154, 217, 0.12);
}

/* "backwards" so cobre o atraso inicial; depois o hover controla o transform */
.trust.visible .trustCard {
  opacity: 1;
  animation: trustIn 0.6s ease backwards;
}

.trust.visible .trustCard:nth-child(2) {
  animation-delay: 0.12s;
}

.trust.visible .trustCard:nth-child(3) {
  animation-delay: 0.24s;
}

/* Linha de cor no topo que se estende no hover */
.trustCard::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  width: 36px;
  background: var(--accent);
  border-radius: 0 0 3px 0;
  transition: width 0.4s ease;
}

.trust.visible .trustCard:hover {
  transform: translateY(-4px);
  border-color: transparent;
  box-shadow: 0 14px 32px rgba(13, 13, 43, 0.08);
}

.trustCard:hover::before {
  width: 100%;
}

.trustIconWrap {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 14px;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.trustImg {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.trustBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.trustTitle {
  font-size: 15px;
  font-weight: 700;
  color: #0d0d2b;
}

.trustText {
  font-size: 13px;
  color: #777;
  line-height: 1.5;
}

.trustMethods {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.trustMethod {
  height: 28px;
  width: auto;
  padding: 4px 8px;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #fff;
  object-fit: contain;
}

.trustLink {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  color: #922877;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.trustLink .fi {
  position: relative;
  top: 2px;
  transition: transform 0.2s;
}

.trustLink:hover .fi {
  transform: translateX(3px);
}

/* Cada icone tem um gesto proprio: corre uma vez quando o cartao aparece
   (tambem no telemovel, onde nao ha hover) e de novo no hover. */
.trust.visible .whatsapp .trustImg {
  animation: trustWiggle 0.7s ease 0.5s;
}
.trust.visible .whatsapp:hover .trustImg {
  animation: trustWiggleHover 0.7s ease;
}

.trust.visible .secure .trustImg {
  animation: trustPop 0.6s ease 0.65s;
}
.trust.visible .secure:hover .trustImg {
  animation: trustPopHover 0.6s ease;
}

/* brilho que atravessa o escudo */
.secure .trustIconWrap::after {
  content: "";
  position: absolute;
  top: 0;
  left: -60%;
  width: 40%;
  height: 100%;
  background: linear-gradient(
    105deg,
    transparent,
    rgba(255, 255, 255, 0.85),
    transparent
  );
  transform: skewX(-15deg);
}
.trust.visible .secure .trustIconWrap::after {
  animation: trustShine 0.9s ease 0.8s;
}
.trust.visible .secure:hover .trustIconWrap::after {
  animation: trustShineHover 0.9s ease;
}

.trust.visible .support .trustImg {
  animation: trustRing 0.8s ease 0.8s;
}
.trust.visible .support:hover .trustImg {
  animation: trustRingHover 0.8s ease;
}

@keyframes trustIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}

@keyframes trustWiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-10deg); }
  50% { transform: rotate(8deg); }
  75% { transform: rotate(-4deg); }
}

@keyframes trustWiggleHover {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-10deg); }
  50% { transform: rotate(8deg); }
  75% { transform: rotate(-4deg); }
}

@keyframes trustPop {
  0%, 100% { transform: scale(1); }
  45% { transform: scale(1.15); }
  70% { transform: scale(0.96); }
}

@keyframes trustPopHover {
  0%, 100% { transform: scale(1); }
  45% { transform: scale(1.15); }
  70% { transform: scale(0.96); }
}

@keyframes trustShine {
  from { left: -60%; }
  to { left: 130%; }
}

@keyframes trustShineHover {
  from { left: -60%; }
  to { left: 130%; }
}

@keyframes trustRing {
  0%, 100% { transform: rotate(0); }
  15%, 45%, 75% { transform: rotate(-9deg); }
  30%, 60% { transform: rotate(9deg); }
}

@keyframes trustRingHover {
  0%, 100% { transform: rotate(0); }
  15%, 45%, 75% { transform: rotate(-9deg); }
  30%, 60% { transform: rotate(9deg); }
}

@media (prefers-reduced-motion: reduce) {
  .trust.visible .trustCard {
    animation: none;
  }
  .trust.visible .trustImg,
  .trust.visible .trustIconWrap::after {
    animation: none !important;
  }
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

/* ── COMO FUNCIONA ──
   Telemovel: linha do tempo vertical (estrada a esquerda, cartoes a direita).
   Tablet/desktop: tres colunas ligadas por uma estrada horizontal que um
   autocarro percorre uma vez quando a secção aparece. */
.howSection {
  background: #fff;
  padding: 64px 0;
}

.steps {
  position: relative;
  list-style: none;
  display: grid;
  gap: 16px;
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 16px;
  align-items: start;
  opacity: 0;
}

.howSection.visible .step {
  opacity: 1;
  animation: howIn 1.1s ease backwards;
}

.howSection.visible .step:nth-child(3) {
  animation-delay: 0.35s;
}

.howSection.visible .step:nth-child(4) {
  animation-delay: 0.7s;
}

/* Troco tracejado entre um passo e o seguinte (so no telemovel) */
.step:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 27px;
  top: 64px;
  bottom: -12px;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    #dcc4d5 0 6px,
    transparent 6px 12px
  );
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 1.2s ease 0.3s;
}

.howSection.visible .step::before {
  transform: scaleY(1);
}

.howSection.visible .step:nth-child(3)::before {
  transition-delay: 1s;
}

.stepNode {
  position: relative;
  z-index: 1;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #f0e8ed;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.4s,
    box-shadow 0.4s;
}

.stepNode.ticket {
  background: linear-gradient(135deg, #f1f8ff, #f8efff);
}

.step:hover .stepNode {
  border-color: #922877;
  box-shadow: 0 0 0 6px rgba(146, 40, 119, 0.08);
}

.stepIcon {
  font-size: 22px;
  color: #922877;
  position: relative;
  top: 2px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.step:hover .stepIcon {
  transform: translateY(-2px) scale(1.12);
}

.stepImg {
  width: 30px;
  height: 30px;
  object-fit: contain;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.step:hover .stepImg {
  transform: rotate(-12deg) scale(1.12);
}

/* Mesmo cartao das garantias e do contacto */
.stepBody {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #f0e8ed;
  border-radius: 16px;
  transition:
    transform 0.4s ease,
    box-shadow 0.4s ease,
    border-color 0.4s ease;
}

.step:hover .stepBody {
  transform: translateY(-3px);
  border-color: transparent;
  box-shadow: 0 14px 32px rgba(13, 13, 43, 0.08);
}

.stepNum {
  font-size: 11px;
  font-weight: 700;
  color: #922877;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stepTitle {
  font-size: 17px;
  font-weight: 700;
  color: #0d0d2b;
}

.stepDesc {
  font-size: 14px;
  color: #777;
  line-height: 1.55;
}

.stepLink {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  color: #922877;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.stepLink .fi {
  position: relative;
  top: 2px;
  transition: transform 0.2s;
}

.stepLink:hover .fi-rs-arrow-small-right {
  transform: translateX(3px);
}

.stepLink:hover .fi-rs-arrow-small-up {
  transform: translateY(-3px);
}

.stepMethods {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.stepMethods img {
  height: 26px;
  width: auto;
  padding: 4px 8px;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #fff;
  object-fit: contain;
}

/* Estrada horizontal: so existe a partir do tablet */
.howRoad {
  display: none;
}

@keyframes howIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 2,2s ate ao bilhete (passo 2, a meio da estrada), 2s parado, 2,2s ate ao
   passo 3. Para mesmo antes de cada circulo, sem o tapar. */
@keyframes howBusDrive {
  0% {
    left: 0;
    animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1);
  }
  34.4% {
    left: calc(50% - 64px);
  }
  65.6% {
    left: calc(50% - 64px);
    animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1);
  }
  100% {
    left: calc(100% - 64px);
  }
}

/* o bilhete "acende" enquanto o autocarro esta parado nele */
@keyframes howTicketPing {
  0% {
    box-shadow: 0 0 0 0 rgba(146, 40, 119, 0.35);
    border-color: #f0e8ed;
  }
  30% {
    border-color: #922877;
  }
  100% {
    box-shadow: 0 0 0 14px rgba(146, 40, 119, 0);
    border-color: #f0e8ed;
  }
}

@media (prefers-reduced-motion: reduce) {
  .howSection.visible .step,
  .howSection.visible .howBus,
  .howSection.visible .stepNode.ticket {
    animation: none;
  }
  .step::before,
  .howRoad::before {
    transition: none;
  }
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

/* ── Baralho de fotos ──
   A foto da frente ocupa o cartao principal; as duas seguintes espreitam por
   tras (em baixo e a direita), com um veu roxo da marca. Ao avancar, a da
   frente sai para a esquerda e a de tras sobe para o lugar dela. */
.fleetMedia {
  --step: 14px;
  position: relative;
  padding: 0 calc(var(--step) * 2) calc(var(--step) * 2) 0;
}

.fleetSlider {
  position: relative;
  height: 300px;
  touch-action: pan-y;
  border-radius: 20px;
}

.fleetSlider:focus-visible {
  outline: 3px solid #922877;
  outline-offset: 6px;
}

.fleetCard {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  overflow: hidden;
  background: #0d0d2b;
  /* encolhe em direcao ao canto inferior direito, para espreitar por la */
  transform-origin: 100% 100%;
  box-shadow: 0 18px 40px rgba(13, 13, 43, 0.2);
  isolation: isolate;
  transition:
    transform 0.85s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.85s ease,
    box-shadow 0.85s ease;
}

/* Veu roxo nas fotos de tras; desaparece quando a foto chega a frente */
.fleetCard::after {
  content: "";
  position: absolute;
  inset: 0;
  background: #922877;
  opacity: 0;
  transition: opacity 0.85s ease;
  pointer-events: none;
}

.fleetCard.front {
  z-index: 4;
  transform: none;
}

.fleetCard.back1 {
  z-index: 3;
  transform: translate(var(--step), var(--step)) scale(0.94);
  box-shadow: 0 10px 24px rgba(13, 13, 43, 0.16);
  cursor: pointer;
}

.fleetCard.back1::after {
  opacity: 0.55;
}

.fleetCard.back1:hover {
  transform: translate(calc(var(--step) * 1.3), calc(var(--step) * 1.3))
    scale(0.94);
}

.fleetCard.back2 {
  z-index: 2;
  transform: translate(calc(var(--step) * 2), calc(var(--step) * 2))
    scale(0.88);
  box-shadow: 0 6px 16px rgba(13, 13, 43, 0.12);
}

.fleetCard.back2::after {
  opacity: 0.8;
}

.fleetCard.hidden {
  z-index: 1;
  opacity: 0;
  transform: translate(calc(var(--step) * 3), calc(var(--step) * 3))
    scale(0.82);
}

/* A que acabou de sair: desliza para a esquerda, inclina e desaparece */
.fleetCard.out {
  z-index: 5;
  opacity: 0;
  transform: translate(-70%, 4%) rotate(-7deg);
  pointer-events: none;
}

.fleetSlide {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.08);
  transition: transform 6s ease-out;
}

/* Zoom lento so na foto da frente */
.fleetCard.front .fleetSlide {
  transform: scale(1);
}

/* Controlos ficam por cima do cartao da frente, sempre no mesmo sitio */
.fleetControls {
  position: absolute;
  inset: 0;
  z-index: 6;
  border-radius: 20px;
  overflow: hidden;
  pointer-events: none;
}

.fleetControls button {
  pointer-events: auto;
}


.fleetNav {
  position: absolute;
  top: 50%;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  color: #0d0d2b;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13, 13, 43, 0.18);
  opacity: 0;
  transform: translateY(-50%) scale(0.9);
  transition:
    opacity 0.25s,
    transform 0.25s,
    background 0.15s;
}

.fleetNav .fi {
  position: relative;
  top: 2px;
}

.fleetNav.prev {
  left: 14px;
}

.fleetNav.next {
  right: 14px;
}

.fleetSlider:hover .fleetNav,
.fleetSlider:focus-within .fleetNav {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.fleetNav:hover {
  background: #fff;
}

/* Em ecras de toque nao ha hover: setas sempre visiveis */
@media (hover: none) {
  .fleetNav {
    opacity: 1;
    transform: translateY(-50%) scale(1);
    width: 34px;
    height: 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fleetCard,
  .fleetCard::after {
    transition-duration: 0.3s;
  }
  .fleetCard.out {
    transform: none;
  }
  .fleetSlide,
  .fleetCard.front .fleetSlide {
    transform: none;
    transition: none;
  }
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

/* ── CONTACTO + RODAPE ──
   Um so bloco com o fundo da marca (a pintura das carrinhas: roxo com faixas
   lima e magenta). Os canais de contacto sao icones soltos, sem cartoes; a
   estrada tracejada do "Como funciona" separa o contacto do rodape. */
.siteFooter {
  position: relative;
  overflow: hidden;
  padding: 72px 24px 0;
  color: #fff;
  background: linear-gradient(160deg, #a12d85 0%, #922877 45%, #6d1c59 100%);
}

.sfLivery {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.sfBand,
.sfStripe {
  opacity: 0;
  transform: translateX(-6%);
  transition:
    opacity 2s ease,
    transform 2.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.sfBand.magenta {
  fill: #bb3a9e;
}

.sfBand.lime {
  fill: #c5d22d;
}

.sfStripe {
  stroke: #f2a516;
  stroke-width: 3;
}

.siteFooter.visible .sfBand.magenta {
  opacity: 0.45;
  transform: none;
}

.siteFooter.visible .sfBand.lime {
  opacity: 0.2;
  transform: none;
  transition-delay: 0.25s;
}

.siteFooter.visible .sfStripe {
  opacity: 0.55;
  transform: none;
  transition-delay: 0.5s;
}

.sfSymbol {
  position: absolute;
  top: -70px;
  right: -110px;
  width: 360px;
  opacity: 0.08;
  pointer-events: none;
}

.sfInner {
  position: relative;
  max-width: 1080px;
  margin: 0 auto;
}

/* ── contacto ── */
.sfContact {
  display: grid;
  gap: 36px;
}

.sfTitle {
  font-size: clamp(32px, 6vw, 52px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin-bottom: 14px;
}

.sfDesc {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.78);
  max-width: 380px;
}

.sfChannels {
  list-style: none;
  display: grid;
}

/* Telemovel: uma linha por canal, separadas por um fio fino */
.sfChannels li + li {
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.sfChannel {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  grid-template-areas:
    "icon label action"
    "icon value action";
  align-items: center;
  column-gap: 14px;
  padding: 16px 0;
  color: #fff;
  text-decoration: none;
}

.sfIcon {
  grid-area: icon;
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* sombra eliptica "no chao", que encolhe quando o icone sobe */
.sfIcon::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 34px;
  height: 6px;
  border-radius: 50%;
  background: rgba(13, 13, 43, 0.3);
  transform: translateX(-50%);
  transition:
    transform 0.6s ease,
    opacity 0.6s ease;
}

.sfIcon img,
.sfIcon .fi {
  position: relative;
  z-index: 1;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sfIcon img {
  width: 46px;
  height: 46px;
  object-fit: contain;
}

.sfIcon .fi {
  font-size: 36px;
  color: #fff;
  top: 3px;
}

/* Flutuacao lenta e desencontrada: os icones "respiram" sem distrair */
.siteFooter.visible .sfIcon img,
.siteFooter.visible .sfIcon .fi {
  animation: sfFloat 5s ease-in-out infinite;
}

.sfChannels li:nth-child(2) .sfIcon img {
  animation-delay: -1.6s;
}

.sfChannels li:nth-child(3) .sfIcon .fi {
  animation-delay: -3.2s;
}

.sfChannel:hover .sfIcon img,
.sfChannel:hover .sfIcon .fi,
.sfChannel:focus-visible .sfIcon img,
.sfChannel:focus-visible .sfIcon .fi {
  animation: none;
  transform: translateY(-8px) rotate(-8deg) scale(1.08);
}

.sfChannel:hover .sfIcon::after {
  transform: translateX(-50%) scale(0.7);
  opacity: 0.6;
}

.sfLabel {
  grid-area: label;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.65);
}

/* sublinhado lima que se desenha no hover */
.sfValue {
  grid-area: value;
  justify-self: start;
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
  padding-bottom: 2px;
  background: linear-gradient(#c5d22d, #c5d22d) no-repeat 0 100% / 0 2px;
  transition: background-size 0.6s ease;
}

.sfChannel:hover .sfValue,
.sfChannel:focus-visible .sfValue {
  background-size: 100% 2px;
}

.sfAction {
  grid-area: action;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #c5d22d;
  font-size: 13px;
  font-weight: 600;
}

.sfAction .fi {
  position: relative;
  top: 2px;
  font-size: 18px;
  transition: transform 0.5s ease;
}

.sfChannel:hover .sfAction .fi {
  transform: translateX(4px);
}

/* No telemovel so a seta; o texto da acao aparece a partir do tablet */
.sfActionText {
  display: none;
}

.sfChannel:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
  border-radius: 8px;
}

/* ── estrada ── */
.sfRoad {
  position: relative;
  height: 2px;
  margin: 48px 0 32px;
}

.sfRoad::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to right,
    rgba(255, 255, 255, 0.4) 0 10px,
    transparent 10px 20px
  );
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 2.4s ease 0.4s;
}

.siteFooter.visible .sfRoad::before {
  transform: scaleX(1);
}

.sfBus {
  position: absolute;
  top: -14px;
  left: calc(100% - 30px);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  color: #922877;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px rgba(13, 13, 43, 0.25);
  opacity: 0;
}

.sfBus .fi {
  position: relative;
  top: 2px;
}

.siteFooter.visible .sfBus {
  opacity: 1;
  animation: sfDrive 6s cubic-bezier(0.45, 0, 0.25, 1) 1s backwards;
}

/* ── rodape ── */
.sfBottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.sfBrand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.sfLogo {
  height: 36px;
  width: auto;
  filter: brightness(0) invert(1);
}

.sfTagline {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.sfNav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 22px;
}

.sfLink {
  padding: 4px 0;
  border: none;
  background: linear-gradient(#c5d22d, #c5d22d) no-repeat 0 100% / 0 2px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition:
    color 0.4s ease,
    background-size 0.5s ease;
}

.sfLink:hover {
  color: #fff;
  background-size: 100% 2px;
}

.sfRoute {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.sfFlag {
  width: 18px;
  height: 12px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
}

.sfRouteArrow {
  color: #c5d22d;
}

.sfCopy {
  margin-top: 28px;
  padding: 20px 0 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

/* ── entrada ── */
.sfHead,
.sfChannels li {
  opacity: 0;
}

.siteFooter.visible .sfHead,
.siteFooter.visible .sfChannels li {
  opacity: 1;
  animation: howIn 1.1s ease backwards;
}

.siteFooter.visible .sfChannels li:nth-child(1) {
  animation-delay: 0.3s;
}

.siteFooter.visible .sfChannels li:nth-child(2) {
  animation-delay: 0.55s;
}

.siteFooter.visible .sfChannels li:nth-child(3) {
  animation-delay: 0.8s;
}

@keyframes sfFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes sfDrive {
  from {
    left: 0;
  }
  to {
    left: calc(100% - 30px);
  }
}

/* Tablet: canais lado a lado, separados por fios verticais */
@media (min-width: 680px) {
  .sfChannels {
    grid-template-columns: repeat(3, 1fr);
  }

  .sfChannels li + li {
    border-top: none;
    border-left: 1px solid rgba(255, 255, 255, 0.16);
  }

  .sfChannel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 4px 24px;
  }

  .sfChannels li:first-child .sfChannel {
    padding-left: 0;
  }

  .sfIcon {
    margin-bottom: 10px;
  }

  .sfAction {
    margin-top: 10px;
  }

  .sfActionText {
    display: inline;
  }

  .sfBottom {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }

  .sfBrand {
    align-items: flex-start;
  }
}

@media (min-width: 1024px) {
  .siteFooter {
    padding: 100px 40px 0;
  }

  .sfContact {
    grid-template-columns: 1fr 1.7fr;
    align-items: end;
    gap: 56px;
  }

  .sfLogo {
    height: 40px;
  }

  .sfSymbol {
    width: 480px;
    top: -100px;
    right: -140px;
  }

  .sfCopy {
    padding-bottom: 28px;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sfBand,
  .sfStripe,
  .sfRoad::before {
    transition: none;
    transform: none;
  }
  .siteFooter.visible .sfHead,
  .siteFooter.visible .sfChannels li,
  .siteFooter.visible .sfBus,
  .siteFooter.visible .sfIcon img,
  .siteFooter.visible .sfIcon .fi {
    animation: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .searchCard.highlight {
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
  .trust {
    padding: 48px 24px 56px;
  }
  .trustInner {
    max-width: 760px;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .trustCard {
    flex-direction: column;
    padding: 24px 20px;
  }

  .howSection {
    padding: 80px 0;
  }
  .steps {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .step {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .step:not(:last-child)::before {
    display: none;
  }

  /* Vai do centro do 1.º no ao centro do 3.º (colunas iguais, gap 24px) */
  .howRoad {
    display: block;
    position: absolute;
    top: 27px;
    left: 28px;
    right: calc((100% - 48px) / 3 - 28px);
    height: 2px;
  }
  .howRoad::before {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to right,
      #dcc4d5 0 8px,
      transparent 8px 16px
    );
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 2s ease 0.3s;
  }
  .howSection.visible .howRoad::before {
    transform: scaleX(1);
  }

  .howBus {
    position: absolute;
    top: -13px;
    left: 0;
    z-index: 2;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #922877;
    color: #fff;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(146, 40, 119, 0.35);
    opacity: 0;
  }
  .howBus .fi {
    position: relative;
    top: 2px;
  }
  /* o autocarro sai do passo 1, para 2s no bilhete e segue ate ao passo 3 */
  .howSection.visible .howBus {
    opacity: 1;
    left: calc(100% - 64px);
    animation: howBusDrive 6.4s linear 1s backwards;
  }
  /* chega ao bilhete aos 1s + 2,2s */
  .howSection.visible .stepNode.ticket {
    animation: howTicketPing 2s ease-out 3.2s;
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
    --step: 22px;
    flex: 1.15;
  }
  .fleetSlider {
    height: 420px;
  }
  .fleetWatermark {
    width: 560px;
    right: -160px;
    bottom: -180px;
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

  .featuresInner {
    grid-template-columns: repeat(4, 1fr);
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
