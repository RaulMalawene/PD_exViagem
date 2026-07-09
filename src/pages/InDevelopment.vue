<script setup>
import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'

defineProps({
  title: { type: String, default: 'Página' },
})
</script>

<template>
  <div class="wrapper">
    <header>
      <Text :txt="title" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="stateBox">
      <div class="stateIconWrap">
        <i class="fi fi-rs-tools stateIcon" />
      </div>
      <h2 class="stateTitle">Em desenvolvimento</h2>
      <p class="stateDesc">Estará disponível brevemente.</p>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  height: 100%;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

header {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.stateBox {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.stateIconWrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(146, 40, 119, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.stateIcon {
  font-size: 28px;
  color: #922877;
}

.stateTitle {
  font-size: 19px;
  font-weight: 700;
  color: #221F20;
}

.stateDesc {
  font-size: 14px;
  color: #888;
}
</style>
