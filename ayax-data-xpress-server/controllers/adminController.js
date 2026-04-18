const User = require("../models/User");

// @desc    Sanya Target ga Supervisor
// @route   PUT /api/v1/admin/assign-target
// @access  Private/Admin
exports.assignTarget = async (req, res) => {
  try {
    const { supervisorId, agentGoal, dataGoal, month } = req.body;

    // Nemo supervisor din
    const supervisor = await User.findById(supervisorId);

    if (!supervisor || supervisor.role !== "supervisor") {
      return res.status(404).json({
        success: false,
        message: "Ba a ga Supervisor da wannan ID din ba",
      });
    }

    // Update target
    supervisor.targets = {
      agentGoal: agentGoal || supervisor.targets.agentGoal,
      dataGoal: dataGoal || supervisor.targets.dataGoal,
      currentMonth: month || supervisor.targets.currentMonth,
    };

    await supervisor.save();

    res.status(200).json({
      success: true,
      message: `An yi nasarar sanya target ga ${supervisor.name}`,
      data: supervisor.targets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An samu matsala wajen sanya target",
      error: error.message,
    });
  }
};

// @desc    Dauko dukkan Supervisors domin Admin ya gani
// @route   GET /api/v1/admin/supervisors
// @access  Private/Admin
exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: "supervisor" }).select(
      "-password",
    );
    res.status(200).json({
      success: true,
      count: supervisors.length,
      data: supervisors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
