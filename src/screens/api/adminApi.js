import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1/admin";

const getHeader = async () => {
  const token = await AsyncStorage.getItem("userToken");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const trackTx = async (id) =>
  axios.get(`${BASE_URL}/track/${id}`, await getHeader());
export const debitUser = async (data) =>
  axios.post(`${BASE_URL}/debit-user`, data, await getHeader());
export const resolveIssue = async (data) =>
  axios.patch(`${BASE_URL}/handle-report`, data, await getHeader());
export const getAllReports = async () =>
  axios.get(`${BASE_URL}/all-reports`, await getHeader());
