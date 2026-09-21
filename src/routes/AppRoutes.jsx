import { Routes, Route, useLocation } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import Home from "../pages/Home";
import CreateStore from "../pages/shops/CreateStore";
import Login from "../pages/Login";
import StoresList from "../pages/shops/StoresList";
import AddCustomer from "../pages/customers/AddCustomer";
import CustomerList from "../pages/customers/CustomerList";
import AddVendor from "../pages/vendor/AddVendor";
import VendorList from "../pages/vendor/VendorList";
import VendorLensOrders from '../pages/vendor/VendorLensOrders'
import VendorPurchaseReport from '../pages/vendor/VendorPurchaseReport'
import AddPrescription from "../pages/prescription/AddPrescription";
import PrescriptionList from "../pages/prescription/PrescriptionList";
import AddSales from "../pages/sales/AddSales";
import SalesList from "../pages/sales/SalesList";
import AddExpense from "../pages/expenses/AddExpense";
import ExpenseList from "../pages/expenses/ExpenseList";
import NewJobCard from "../pages/job-card/NewJobCard";
import Inventory from "../pages/products/Inventory";
import JobCardList from "../pages/job-card/JobCardList";
import MainReport from "../pages/reports/MainReport";
import WhatsappSettings from "../pages/shops/WhatsappSettings";
import User from "../pages/User";
import VendorOrder from "../pages/vendor/VendorOrder";
import ProtectedRoute from "./ProtectedRoute";
import NotFound from "../pages/not-found/NotFound";
import Forbidden from "../pages/not-found/Forbidden";
import DailyReport from "../pages/reports/DailyReport";
import AddTaskPage from "../pages/task/AddTask";
import TaskList from "../pages/task/TaskList";
import EditJobCard from "../pages/job-card/EditJobCard";
import { useEffect } from "react";
import AddRepair from "../pages/repair/AddRepair";
import RepairList from "../pages/repair/RepairList";
import AddAssets from "../pages/store-assets/AddAssets";
import AssetList from "../pages/store-assets/AssetList";
import EditStore from "../pages/shops/EditStore";
import DigiAIPage from "../pages/ai/DigiAI";
import SellerMediaGallery from "../pages/whatsnew/Sellermediagallery";
import WhatsAppLink from "../pages/link-whatsapp/Whatsapplink";
import Settings from "../pages/settings/Settings";
import FieldSettingsPage from "../pages/settings/Fieldsettings";
import OPDReport from "../pages/opd/OPDReport";
import AddPatient from "../pages/patient/Addpatient";
import PatientList from "../pages/patient/Patientlist";
import OPDList from "../pages/opd/OPDList";
import AddAppointment from "../pages/appointment/Addappointment";
import AppointmentList from "../pages/appointment/Appointmentlist";
import EditOPDReport from "../pages/opd/Editopdreport";

export default function AppRoutes() {

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />

        {/* SUPER ADMIN ONLY ROUTES */}
        <Route
          path="/stores/create"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <CreateStore />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stores"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <StoresList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/store/:storeId/whatsapp-settings"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <WhatsappSettings />
            </ProtectedRoute>
          }
        />


        <Route path="/stores/edit/:storeId"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <EditStore />
            </ProtectedRoute>
          }
        />



        {/* /////////////////////////////////////////// */}
        {/* /////////// ADMIN AND STAFF ONLY ////////// */}
        {/* /////////////////////////////////////////// */}



        {/* ADMIN AND STAFF ONLY */}
        <Route path="/customer/add"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD CUSTOMERS">
              <AddCustomer />
            </ProtectedRoute>
          }
        />

        <Route path="/customers/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="CUSTOMERS LIST">
              <CustomerList />
            </ProtectedRoute>
          }
        />


        {/* ADMIN AND STAFF ONLY */}
        <Route path="/add/patient"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD PATIENT">
              <AddPatient />
            </ProtectedRoute>
          }
        />

        {/* ADMIN AND STAFF ONLY */}
        <Route path="/patient/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="PATIENT LIST">
              <PatientList />
            </ProtectedRoute>
          }
        />

        {/* ADMIN AND STAFF ONLY */}
        <Route path="/opd/report"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="OPD REPORT">
              <OPDReport />
            </ProtectedRoute>
          }
        />

        {/* ADMIN AND STAFF ONLY */}
        <Route path="/opd/edit/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="EDIT OPD">
              <EditOPDReport />
            </ProtectedRoute>
          }
        />

        {/* ADMIN AND STAFF ONLY */}
        <Route path="/opd/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="OPD LIST">
              <OPDList />
            </ProtectedRoute>
          }
        />

        {/* ADMIN AND STAFF ONLY */}
        <Route path="/add/appointment"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD APPOINTMENT">
              <AddAppointment />
            </ProtectedRoute>
          }
        />

        {/* ADMIN AND STAFF ONLY */}
        <Route path="/appointment/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="APPOINTMENT LIST">
              <AppointmentList />
            </ProtectedRoute>
          }
        />

        <Route path="/vendor/add"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD VENDORS">
              <AddVendor />
            </ProtectedRoute>
          }
        />

        <Route path="/vendors/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="VENDORS LIST">
              <VendorList />
            </ProtectedRoute>
          }
        />
        <Route path="/vendors/lensorders"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="LENS ORDERS LIST">
              <VendorLensOrders />
            </ProtectedRoute>
          }
        />

        <Route path="/vendors/purchasereport"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requireddPage="VENDOR PURCHASE REPORT">
              <VendorPurchaseReport />
            </ProtectedRoute>
          }
        />





        <Route path="/vendors/order"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="VENDOR ORDERS">
              <VendorOrder />
            </ProtectedRoute>
          }
        />

        <Route path="/prescription/add"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD PRESCRIPTION">
              <AddPrescription />
            </ProtectedRoute>
          }
        />

        <Route path="/prescription/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="PRESCRIPTIONS LIST">
              <PrescriptionList />
            </ProtectedRoute>
          }
        />

        <Route path="/sales/add"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD SALES">
              <AddSales />
            </ProtectedRoute>
          }
        />

        <Route path="/sales/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="SALES LIST">
              <SalesList />
            </ProtectedRoute>
          }
        />

        <Route path="/expense/add"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD EXPENSES">
              <AddExpense />
            </ProtectedRoute>
          }
        />

        <Route path="/expense/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="EXPENSES LIST">
              <ExpenseList />
            </ProtectedRoute>
          }
        />

        <Route path="/new-jc"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="NEW JOB CARDS">
              <NewJobCard />
            </ProtectedRoute>
          }
        />

        <Route path="/jc/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="JOB CARDS LIST">
              <JobCardList />
            </ProtectedRoute>
          }
        />

        <Route path="/edit/jc"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="JOB CARDS EDIT">
              <EditJobCard />
            </ProtectedRoute>
          }
        />

        <Route path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="INVENTORY">
              <Inventory />
            </ProtectedRoute>
          }
        />

        <Route path="/report/main"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="MAIN REPORTS">
              <MainReport />
            </ProtectedRoute>
          }
        />

        <Route path="/report/daily"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="DAILY REPORTS">
              <DailyReport />
            </ProtectedRoute>
          }
        />

        <Route path="/user"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="USERS">
              <User />
            </ProtectedRoute>
          }
        />

        <Route path="/addtask"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD TASK">
              <AddTaskPage />
            </ProtectedRoute>
          }
        />

        <Route path="/task/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="TASK LIST">
              <TaskList />
            </ProtectedRoute>
          }
        />

        <Route path="/add/repair"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD REPAIR">
              <AddRepair />
            </ProtectedRoute>
          }
        />

        <Route path="/repair/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="REPAIR LIST">
              <RepairList />
            </ProtectedRoute>
          }
        />

        <Route path="/add/asset"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ADD ASSETS">
              <AddAssets />
            </ProtectedRoute>
          }
        />

        <Route path="/asset/list"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]} requiredPage="ASSETS LIST">
              <AssetList />
            </ProtectedRoute>
          }
        />


        <Route path="/digi/ai"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} requiredPage="hasAI">
              <DigiAIPage />
            </ProtectedRoute>
          }
        />


        <Route path="/link/whatsapp"
          element={<ProtectedRoute allowedRoles={["ADMIN"]}>
            <WhatsAppLink />
          </ProtectedRoute>}
        />

        <Route path="/store/settings"
          element={<ProtectedRoute allowedRoles={["ADMIN"]}>
            <Settings />
          </ProtectedRoute>}
        />

        <Route path="/store/fields"
          element={<ProtectedRoute allowedRoles={["ADMIN"]}>
            <FieldSettingsPage />
          </ProtectedRoute>}
        />

        <Route path="/whats/new/media"
          element={<ProtectedRoute allowedRoles={["ADMIN"]}>
            <SellerMediaGallery />
          </ProtectedRoute>}
        />


        <Route path="/403" element={<Forbidden />} />
        <Route path="/404" element={<NotFound />} />

        <Route path="*" element={<NotFound />} />

      </Route>
    </Routes>
  );
}
