import Hospital from "../models/hospitalModel.js";
import ICU from '../models/icuModel.js';
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import VacationRequest from "../models/vacationRequestModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import { io } from "../index.js";
export const assignBackupManager = async (req, res, next) => {
    try {
        const { hospitalId, backupManagerId } = req.body;

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return next(new ErrorHandler("Hospital not found", 404));
        }

        const backupManager = await User.findById(backupManagerId);
        if (!backupManager || backupManager.role !== "Manager") {
            return next(new ErrorHandler("Backup Manager not found or is not a Manager", 404));
        }

        hospital.backupManager = backupManagerId;
        await hospital.save();

        res.status(200).json({
            success: true,
            message: "Backup manager assigned successfully",
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};



export const registerICU = async (req, res, next) => {
    
    try {
        const { hospitalId, specialization, status } = req.body;

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return next(new ErrorHandler("Hospital not found", 404));
        }

        
        if (!specialization ||!status) {
            return next(new ErrorHandler("Specialization and status are required", 400));
        }


        const icuData = {
            hospital: hospitalId, 
            specialization,
            status}
        const newICU = new ICU(icuData);

        await newICU.save();

        const updatedICUs = await ICU.find({ status: 'Available' }).populate('hospital', 'name address').exec();
        io.emit('icuUpdated', updatedICUs);

        res.status(201).json({
            success: true,
            message: "ICU registered successfully",
            data: newICU,
        });} catch (error) {
        next(new ErrorHandler(`Error while registering ICU: ${error.message}`, 500));
    }
};

export const deleteICU = async (req, res, next) => {
    try {
        const { icuId } = req.params;

        const icu = await ICU.findByIdAndDelete(icuId);
        if (!icu) {
            return next(new ErrorHandler("ICU not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "ICU deleted successfully",
        });
    } catch (error) {
        next(new ErrorHandler(`Error while deleting ICU: ${error.message}`, 500));
    }
};


export const updateICU = async (req, res, next) => {
    try {
        const { icuId } = req.params;
        const updates = req.body;

        const icu = await ICU.findByIdAndUpdate(icuId, updates, { new: true});
        if (!icu) {
            return next(new ErrorHandler("ICU not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "ICU updated successfully",
            data: icu,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while updating ICU: ${error.message}`, 500));
    }
};



export const viewICUs = async (req, res, next) => {
    try {
        const { hospitalId, specialization } = req.query; 

        let query = {};
        if (hospitalId) {
            query.hospital = hospitalId;
        }
        if (specialization) {
            query.specialization = specialization;
        }

        const icus = await ICU.find(query).populate('hospital', 'name address'); 

        if (icus.length === 0) {
            return next(new ErrorHandler("No ICUs found for the given criteria", 404));
        }

        res.status(200).json({
            success: true,
            message: "ICUs fetched successfully",
            data: icus,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while fetching ICUs: ${error.message}`, 500));
    }
};


export const addEmployee = async (req, res, next) => {
    try {
        const { firstName, lastName, userName, role, email, phone, userPass ,gender } = req.body;

        const existingEmployee = await User.findOne({ userName });
        if (existingEmployee) {
            return next(new ErrorHandler("Username already exists", 400));
        }

        const newEmployee = new User({
            firstName,
            lastName,
            userName,
            email,
            phone,
            userPass,
            role,
            gender,
        });

        await newEmployee.save();

        res.status(201).json({
            success: true,
            message: "Employee added successfully",
            data: newEmployee,
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

export const removeEmployee = async (req, res, next) => {
    try {
        const { userName } = req.params;

        const employee = await User.findOne({ userName });
        if (!employee) {
            return next(new ErrorHandler("Employee not found", 404));
        }

        await employee.remove();

        res.status(200).json({
            success: true,
            message: "Employee removed successfully",
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

export const trackEmployeeTasks = async (req, res, next) => {
    try {
        const { useCaseName } = req.query; 

        const employees = await User.find({ role: useCaseName });
        if (employees.length === 0) {
            return next(new ErrorHandler("No employees found for the given use case name", 404));
        }

        const employeeIds = employees.map(employee => employee._id);

        const tasks = await Task.find({ assignedTo: { $in: employeeIds } }).populate('assignedTo', 'firstName lastName role');

        if (tasks.length === 0) {
            return next(new ErrorHandler("No tasks found for the employees", 404));
        }

        res.status(200).json({
            success: true,
            message: "Tasks tracked successfully",
            data: tasks,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while tracking employee tasks: ${error.message}`, 500));
    }
};

export const createAndAssignTask = async (req, res, next) => {
    try {
        const { name, employeeId, deadLine, priority, status } = req.body;

        if (!name || !employeeId || !deadLine || !priority || !status) {
            return next(new ErrorHandler("All fields are required.", 400));
        }

        const employee = await User.findById(employeeId);
        if (!employee || !["Nurse", "Cleaner", "Receptionist"].includes(employee.role)) {
            return next(
                new ErrorHandler("Employee not found or is not eligible for tasks.", 404)
            );
        }

        const task = new Task({
            name,
            assignedTo: employeeId,
            deadLine,
            priority,
            status,
        });

        await task.save();

        res.status(201).json({
            success: true,
            message: "Task created and assigned successfully",
            data: task,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while creating and assigning task: ${error.message}`, 500));
    }
};



export const registerVisitorRoom = async (req, res, next) => {
    try {
        const { hospitalId, capacity, roomType } = req.body;

        if (!hospitalId || !capacity || !roomType) {
            return next(new ErrorHandler("All fields are required", 400));
        }

        const hospital = await mongoose.model('Hospital').findById(hospitalId);
        if (!hospital) {
            return next(new ErrorHandler("Hospital not found", 404));
        }

        const visitorRoomData = {
            hospital: hospitalId,
            capacity,
            roomType,
        };

        const newVisitorRoom = new VisitorRoom(visitorRoomData);

        await newVisitorRoom.save();

        res.status(201).json({
            success: true,
            message: "Visitor room registered successfully",
            data: newVisitorRoom,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while registering visitor room: ${error.message}`, 500));
    }
};


export const handleVacationRequest = async (req, res, next) => {
    try {
        const { employeeId, startDate, endDate } = req.body;

        const newRequest = new VacationRequest({
            employee: employeeId,
            startDate,
            endDate,
        });

        await newRequest.save();

        res.status(201).json({
            success: true,
            message: "Vacation request handled successfully",
            data: newRequest,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while handling vacation request: ${error.message}`, 500));
    }
};
export const updateVacationRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body; 

        const vacationRequest = await VacationRequest.findById(requestId);

        if (!vacationRequest) {
            return next(new ErrorHandler("Vacation request not found", 404));
        }

        vacationRequest.status = status; 
        await vacationRequest.save();

        res.status(200).json({
            success: true,
            message: "Vacation request updated successfully",
            data: vacationRequest,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while updating vacation request: ${error.message}`, 500));
    }
};

export const viewVacationRequests = async (req, res, next) => {
    try {
        const { employeeId } = req.query; 

        let query = {};
        if (employeeId) {
            query.employee = employeeId;
        }

        const vacationRequests = await VacationRequest.find(query).populate('employee', 'firstName lastName');

        if (vacationRequests.length === 0) {
            return next(new ErrorHandler("No vacation requests found", 404));
        }

        res.status(200).json({
            success: true,
            message: "Vacation requests retrieved successfully",
            data: vacationRequests,
        });
    } catch (error) {
        next(new ErrorHandler(`Error while retrieving vacation requests: ${error.message}`, 500));
    }
};


export const calculateFees = async (req, res, next) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findById(serviceId);
        if (!service) {
            return next(new ErrorHandler("Service not found", 404));
        }

        const fees = service.fee;

        res.status(200).json({
            success: true,
            message: "Fees calculated successfully",
            data: { fees },
        });
    } catch (error) {
        next(new ErrorHandler(`Error while calculating fees: ${error.message}`, 500));
    }
};
