import { createNavigationContainerRef } from '@react-navigation/native';

// Lets components rendered outside a navigator (e.g. the notification banner) navigate
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
}
