using System;

namespace AutoTrack.Models;

public class UserAccount
{
    public int UserId { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string UserRole { get; set; }
    public required bool IsActive { get; set; }
    

}
