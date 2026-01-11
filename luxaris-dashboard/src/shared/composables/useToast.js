import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

/**
 * Toast Notification Composable
 * Provides centralized toast notifications using vue3-toastify
 */
export function useToast() {
  
    const defaultOptions = {
        autoClose: 3000,
        position: 'bottom-right',
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'dark',
        transition: 'slide'
    };

    const showToast = (message, type = 'info', options = {}) => {
        const mergedOptions = { ...defaultOptions, ...options };
    
        switch (type) {
            case 'success':
                toast.success(message, mergedOptions);
                break;
            case 'error':
                toast.error(message, { ...mergedOptions, autoClose: 4000 });
                break;
            case 'warning':
                toast.warning(message, { ...mergedOptions, autoClose: 3500 });
                break;
            case 'info':
            default:
                toast.info(message, mergedOptions);
                break;
        }
    };

    const showToastSuccess = (message, duration) => {
        showToast(message, 'success', duration ? { autoClose: duration } : {});
    };

    const showToastError = (message, duration) => {
        showToast(message, 'error', duration ? { autoClose: duration } : {});
    };

    const showToastWarning = (message, duration) => {
        showToast(message, 'warning', duration ? { autoClose: duration } : {});
    };

    const showToastInfo = (message, duration) => {
        showToast(message, 'info', duration ? { autoClose: duration } : {});
    };

    return {
        showToast,
        showToastSuccess,
        showToastError,
        showToastWarning,
        showToastInfo
    };
}
