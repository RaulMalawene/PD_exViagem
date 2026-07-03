import api from "../api/axios";

export default {
  getCaptureInfo: (token) =>
    api.get(`/drivers/photo-capture/${token}`).then((r) => r.data),
  upload: (token, formData) =>
    api
      .post(`/drivers/photo-capture/${token}`, formData, {
        headers: { "Content-Type": undefined },
      })
      .then((r) => r.data),
};
