<script setup>
import LogoPD from '../assets/LogoPD.svg'

function openWhatsApp() {
    const numero = '258862051706'
    const mensagem = 'Olá, gostaria de ter mais informações acerca do tracking e requisições'
    const link = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensagem)
    window.open(link, '_blank')
}
</script>

<template>
    <header class="header">
        <div class="headerInner">
            <img :src="LogoPD" alt="Portador Diário" class="logo" />
            <button class="contactBtn" @click="openWhatsApp">
                Contacte-nos
            </button>
        </div>
    </header>
</template>

<style scoped>
.header {
    background: #fff;
    border-bottom: 1px solid #EEEEEE;
    position: sticky;
    top: 0;
    z-index: 100;
}

.headerInner {
    width: 100%;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.logo {
    height: 36px;
    width: auto;
}

.contactBtn {
    display: flex;
    align-items: center;
    background: #922877;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Ubuntu', sans-serif;
    transition: opacity 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
}

.contactBtn:hover {
    opacity: 0.88;
}

@media (min-width: 1024px) {
    .headerInner {
        padding: 16px 40px;
    }

    .logo {
        height: 40px;
    }
}
</style>
