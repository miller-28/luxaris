<template>
    <DashboardLayout>
        <div class="page-content">
            <!-- User Edit Panel in Dialog -->
            <v-dialog 
                v-model="dialogOpen" 
                max-width="900"
                persistent
                scrollable
            >
                <UsersEditPanel 
                    :user="currentUser"
                    :loading="loading"
                    @submit="handleSubmit"
                    @approve="handleApprove"
                    @disable="handleDisable"
                    @enable="handleEnable"
                    @close="handleClose"
                />
            </v-dialog>
        </div>
    </DashboardLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import UsersEditPanel from '../components/UsersEditPanel.vue';
import { useUsers } from '../../application/composables/useUsers';
import { useUsersStore } from '../../infrastructure/store/usersStore';
import { useToast } from '@/shared/composables/useToast';

const route = useRoute();
const router = useRouter();
const { t: $t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const usersStore = useUsersStore();

const {
    loadUser,
    approveUser,
    disableUser,
    enableUser,
    updateUser
} = useUsers();

const loading = ref(false);
const dialogOpen = ref(true);

const currentUser = computed(() => usersStore.currentUser);

const handleClose = () => {
    dialogOpen.value = false;
    // Navigate back to users list after dialog close animation
    setTimeout(() => {
        router.push('/dashboard/admin/users');
    }, 300);
};

const handleSubmit = async (updateData) => {
    loading.value = true;

    try {
        const userId = parseInt(route.params.id);
        
        // Update user data via API
        const result = await updateUser(userId, updateData);
        
        if (result.success) {
            showToastSuccess($t('admin.users.edit.success'));
            // Reload user data
            await loadUser(userId);
        } else {
            showToastError(result.error || $t('admin.users.edit.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.edit.failed'));
    } finally {
        loading.value = false;
    }
};

const handleApprove = async (userId) => {
    loading.value = true;

    try {
        const result = await approveUser(userId);

        if (result.success) {
            showToastSuccess($t('admin.users.approve.success'));
            // Reload user data
            await loadUser(userId);
        } else {
            showToastError(result.error || $t('admin.users.approve.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.approve.failed'));
    } finally {
        loading.value = false;
    }
};

const handleDisable = async (userId) => {
    loading.value = true;

    try {
        const result = await disableUser(userId);

        if (result.success) {
            showToastSuccess($t('admin.users.disable.success'));
            // Reload user data
            await loadUser(userId);
        } else {
            showToastError(result.error || $t('admin.users.disable.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.disable.failed'));
    } finally {
        loading.value = false;
    }
};

const handleEnable = async (userId) => {
    loading.value = true;

    try {
        const result = await enableUser(userId);

        if (result.success) {
            showToastSuccess($t('admin.users.enable.success'));
            // Reload user data
            await loadUser(userId);
        } else {
            showToastError(result.error || $t('admin.users.enable.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.enable.failed'));
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    const userId = parseInt(route.params.id);
    
    if (!userId) {
        showToastError($t('admin.users.errors.invalidUserId'));
        router.push('/dashboard/admin/users');
        return;
    }

    loading.value = true;
    try {
        const result = await loadUser(userId);
        
        if (!result.success) {
            showToastError(result.error || $t('admin.users.errors.loadFailed'));
            router.push('/dashboard/admin/users');
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.errors.loadFailed'));
        router.push('/dashboard/admin/users');
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.page-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}
</style>
