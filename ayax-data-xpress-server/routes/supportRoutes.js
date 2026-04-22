router.get(
  "/search-user/:identifier",
  protect,
  authorize("support", "admin"),
  searchUser,
);
router.post("/request-refund", protect, authorize("support"), requestRefund);
