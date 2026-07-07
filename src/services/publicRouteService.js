import api from '../api/axios'

export default {
  list: () => api.get('/public/routes').then((r) => r.data),
}
