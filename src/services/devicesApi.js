import api from './api'

export const devicesApi = {
  getByTenant: (tenantId) =>
    api.get(`/tenants/${tenantId}/devices`).then((r) => r.data),

  create: (tenantId, payload) =>
    api.post(`/tenants/${tenantId}/devices`, payload).then((r) => r.data),

  enableWebDevice: (deviceId) =>
    api.post(`/devices/${deviceId}/web-device/enable`).then((r) => r.data),

  regenerateWebDeviceToken: (deviceId) =>
    api.post(`/devices/${deviceId}/web-device/regenerate-token`).then((r) => r.data),

  disableWebDevice: (deviceId) =>
    api.post(`/devices/${deviceId}/web-device/disable`).then((r) => r.data),
}
