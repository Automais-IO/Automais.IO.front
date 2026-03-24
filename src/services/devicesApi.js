import api from './api'

export const devicesApi = {
  getByTenant: (tenantId) =>
    api.get(`/tenants/${tenantId}/devices`).then((r) => r.data),

  create: (tenantId, payload) =>
    api.post(`/tenants/${tenantId}/devices`, payload).then((r) => r.data),

  enableWebDevice: (devEui) =>
    api.post(`/devices/${encodeURIComponent(devEui)}/web-device/enable`).then((r) => r.data),

  regenerateWebDeviceToken: (devEui) =>
    api.post(`/devices/${encodeURIComponent(devEui)}/web-device/regenerate-token`).then((r) => r.data),

  disableWebDevice: (devEui) =>
    api.post(`/devices/${encodeURIComponent(devEui)}/web-device/disable`).then((r) => r.data),
}
