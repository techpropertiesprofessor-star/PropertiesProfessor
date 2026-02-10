import api from './client';

const holidayAPI = {
  getAll: () => api.get('/holidays'),
  create: (data) => api.post('/holidays', data),
};

export default holidayAPI;
