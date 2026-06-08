<script setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="lg:pl-64">
      <AppNavbar @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>
