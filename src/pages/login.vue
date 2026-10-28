<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff, LoaderCircle, LogIn } from '@lucide/vue'
import { useAuth } from '@/composables/useAuth'
import { appConfig } from '@/core/app/appConfig'
import { HOME_PATH } from '@/core/navigation/landing'
import logo from '@/assets/logo-ucodis.png'
import type { DemoAccount } from '@/types/auth.types'

const { t } = useI18n()
const { login } = useAuth()
const router = useRouter()

const userCode = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)

function fillDemoAccount(account: DemoAccount) {
  userCode.value = account.code
  password.value = account.password
  error.value = ''
}

async function handleSubmit() {
  error.value = ''
  isLoading.value = true
  const result = await login(userCode.value, password.value)
  isLoading.value = false
  if (result.success) await router.push(HOME_PATH)
  else error.value = result.error ?? t('auth.error.invalidCredentials')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-muted/50 p-4">
    <Card class="w-full max-w-md border-none">
      <CardHeader class="text-center space-y-4">
        <div class="flex justify-center">
          <img :src="logo" :alt="appConfig.companyName" class="h-12" />
        </div>
        <CardTitle class="text-2xl">{{ t('auth.login') }}</CardTitle>
        <CardDescription>{{ t('auth.loginDescription') }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <Alert v-if="error" variant="destructive">
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>

          <div class="space-y-2">
            <Label for="userCode">{{ t('auth.userCode') }}</Label>
            <Input
              id="userCode"
              autocomplete="username"
              v-model="userCode"
              :placeholder="t('auth.userCodePlaceholder')"
              required
              :disabled="isLoading"
            />
          </div>

          <div class="space-y-2">
            <Label for="password">{{ t('auth.password') }}</Label>
            <div class="relative">
              <Input
                id="password"
                autocomplete="current-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="t('auth.passwordPlaceholder')"
                required
                :disabled="isLoading"
                class="pr-10"
              />
              <button
                type="button"
                tabindex="-1"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <Button type="submit" class="w-full" :disabled="isLoading">
            <template v-if="isLoading">
              <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              {{ t('auth.loggingIn') }}
            </template>
            <template v-else>
              <LogIn class="mr-2 h-4 w-4" />
              {{ t('auth.loginAction') }}
            </template>
          </Button>
        </form>

        <DemoAccountPicker
          v-if="appConfig.useMockApi"
          :selected-code="userCode"
          @select="fillDemoAccount"
        />
      </CardContent>
    </Card>
  </div>
</template>
