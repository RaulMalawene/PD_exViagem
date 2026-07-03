<script setup>
import TextButton from './TextButton.vue'
import MenuNest from './MenuNest.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

defineProps({
  txt: String,
  icon: String,
  active: Boolean,
  nests: Array,
  selectedNest: String,
})

defineEmits(['click', 'update:selectedNest'])
</script>

<template>
  <div class="wrapper">
    <div class="fakebutton" :class="{ selected: active }" @click="$emit('click')">
      <div class="iconText">
        <i :class="icon"></i>

        <TextButton :txt="txt" weight="200" size="15px" />
      </div>

      <div class="drop">
        <i class="fi fi-br-angle-small-down"></i>
      </div>
    </div>

    <div class="nest" v-if="active">
      <hr />

      <div class="menu">
        <MenuNest
          v-for="(item, index) in nests"
          :key="index"
          :txt="item.txt"
          :icon="item.icon"
          :class="{ selectedNest: selectedNest === item.txt }"
          @click="
            $emit('update:selectedNest', item.txt)
            router.push(item.route)
          "
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fakebutton {
  height: 45px;
  width: 100%;
  background: #EEEEEE;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 28px;
  cursor: pointer;
  transition: 0.3s;
  color: #221F20;
}

.fakebutton i {
  position: relative;
  top: 2px;
}

.fakebutton:hover {
  background: #922877;
  color: #EEEEEE;
}

.fakebutton:hover i {
  color: #8B9B1A;
}

.fakebutton.selected {
  background: #922877;
  color: #EEEEEE;
}

.fakebutton.selected i {
  color: #8B9B1A;
}

.iconText {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nest {
  display: flex;
  gap: 17px;
  margin-left: 35px;
  margin-top: 5px;
}

.nest hr {
  width: 2px;
  height: auto;
  background: #221F20;
  border: none;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.selectedNest {
  background: #922877;
  color: white;
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .nest {
    margin-left: 8px;
    gap: 6px;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .nest {
    margin-left: 18px;
    gap: 10px;
  }
}

@media (min-width: 1440px) and (max-width: 1599px) {
  .nest {
    margin-left: 24px;
    gap: 12px;
  }
}
</style>
