<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BonusController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SubTaskController;
use App\Http\Controllers\ClientAllController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\ClientTaskController;
use App\Http\Controllers\TaskAssignmentController;
use App\Http\Controllers\AssignmentNotificationController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/
Route::get('/home', function () {
    return view('home');
})->name('home');

Auth::routes(['register' => false]);
Route::get('/', function () {
    if (Auth::check()) {
        $user = Auth::user();
        if ($user->hasRole('User')) {
            return redirect()->route('client.allsubtask');
        } elseif ($user->hasRole('Admin')) {
            return redirect()->route('grafik');
        } elseif ($user->hasRole('Super Admin')) {
            return redirect()->route('admin.users.index');
        }
    }
    return redirect()->route('login');
});

Route::middleware(['auth', 'role:Super Admin|Admin'])->prefix('admin')->as('admin.')->group(function () {
    Route::resources([
        'roles' => RoleController::class,
        'users' => UserController::class,
        'projects' => ProjectController::class,
        'tasks' => TaskController::class,
        'subtasks' => SubTaskController::class,
        'task_assignments'=> TaskAssignmentController::class
    ]);
	Route::delete('mass-delete', [TaskAssignmentController::class, 'massDelete'])->name('task_assignments.massDelete');    
});
Route::middleware(['auth', 'role:Admin'])->group(function () {
    Route::get('/tasks', [ClientTaskController::class, 'index'])->name('tasks.index');
    Route::get('/task/swod', [ClientTaskController::class, 'swod'])->name('task.swod');
    Route::get('/grafik', [ClientTaskController::class, 'grafik'])->name('grafik');
    Route::get('/accounts/staff/', [ClientTaskController::class, 'staff'])->name('accounts.staffs');
    Route::get('/staff/kpi/{user}', [ClientTaskController::class, 'kpi'])->name('accounts.staff.kpi');
    Route::get('/task-assignments/{user}', [ClientTaskController::class, 'showAssign'])->name('client-task.show');
	Route::get('/taskassignments/export', [ClientTaskController::class, 'exportExcel'])->name('task-assignments.export');
    Route::get('/taskassignments/export-detailed', [ClientTaskController::class, 'exportDetailedExcel'])->name('task-assignments.export-detailed');
    Route::get('/task-assignments/{user}/task/{task}', [ClientTaskController::class, 'taskDetails'])->name('client-task.task-details');
    Route::get('/tasks/{taskId}', [ClientTaskController::class, 'show'])->name('tasks.show');
    Route::get('/tasks/{taskId}/assign/{staffId}', [ClientTaskController::class, 'assignTask'])->name('tasks.assign');
    Route::post('/tasks/{taskId}/assign/{staffId}', [ClientTaskController::class, 'storeRating'])->name('tasks.storeRating');
    Route::get('/assignment/user/{id}', [ClientTaskController::class, 'userAssignments'])->name('assignment.user');
    Route::get('/assignment/{id}/edit', [ClientTaskController::class, 'edit'])->name('assignment.edit');
    Route::post('/assignment/{id}/update-comment', [ClientTaskController::class, 'updateComment'])->name('assignment.updateComment');
	Route::get('/notifications', [AssignmentNotificationController::class, 'index'])->name('notifications.index');
});
Route::middleware(['auth', 'role:User'])->group(function () {
    Route::get('/index', [ClientAllController::class, 'index'])->name('client.index');
    Route::get('/subtask', [ClientAllController::class, 'subtask'])->name('client.subtask');
    Route::get('/allsubtask', [ClientAllController::class, 'allsubtask'])->name('client.allsubtask');    
    Route::get('/profile', [ClientAllController::class, 'editProfile'])->name('profile.edit');
    Route::post('/profile/update', [ClientAllController::class, 'updateProfile'])->name('profile.update');
    Route::resource('assignments', AssignmentController::class);
});
